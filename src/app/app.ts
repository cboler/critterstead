import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { AREAS } from './game/content';
import { LocalGameHost, knowledgeStage } from './game/host';
import { GameCommand, GameState, Interaction, Point } from './game/model';
import { IndexedDbStorage } from './game/storage';
import { GameWorld } from './game/world';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
}

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('world', { static: true }) private worldElement!: ElementRef<HTMLElement>;
  private readonly zone = inject(NgZone);
  private host = new LocalGameHost();
  private readonly storage = new IndexedDbStorage();
  private world?: GameWorld;
  private frame = 0;
  private previousTime = 0;
  private refreshElapsed = 0;
  private saveElapsed = 0;
  private readonly keys = new Set<string>();
  private walkTo: Point | null = null;
  private destroyed = false;
  private saveBlocked = false;
  private audio?: AudioContext;
  private installPrompt?: InstallPrompt;
  protected readonly state = signal<GameState>(structuredClone(this.host.state));
  protected readonly nearby = signal<Interaction | null>(null);
  protected readonly ready = signal(false);
  protected readonly paused = signal(false);
  protected readonly panel = signal<'journal' | 'help' | 'developer' | null>(null);
  protected readonly saveStatus = signal('Opening your homestead…');
  protected readonly error = signal('');
  protected readonly sound = signal(false);
  protected readonly canInstall = signal(false);
  protected readonly resetArmed = signal(false);
  protected readonly knowledgeStage = knowledgeStage;
  protected readonly areas = AREAS;
  protected readonly statNames = ['strength', 'endurance', 'speed', 'intelligence'] as const;
  protected readonly goals = [
    { flag: 'cared', title: 'A little care', description: 'Give Pip something good to eat.' },
    { flag: 'trained', title: 'Find your rhythm', description: 'Try the training hoop together.' },
    {
      flag: 'gathered',
      title: 'Beyond the garden gate',
      description: 'Pick sunberries in the glade.',
    },
    { flag: 'improved', title: 'Room to grow', description: 'Sell berries and mend Pip’s shed.' },
  ];

  async ngAfterViewInit(): Promise<void> {
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.blur);
    window.addEventListener('pagehide', this.pageHide);
    document.addEventListener('visibilitychange', this.visibility);
    window.addEventListener('beforeinstallprompt', this.beforeInstall);
    try {
      const saved = await this.storage.load();
      if (this.destroyed) return;
      if (saved) this.host = new LocalGameHost(saved);
      this.saveStatus.set(saved ? 'Your homestead is saved' : 'A new beginning');
    } catch (error) {
      this.saveBlocked = true;
      this.error.set(
        `${error instanceof Error ? error.message : 'Could not open your save.'} Your existing save has been kept. Saving is paused until you reset it in developer tools.`,
      );
      this.saveStatus.set('Save needs attention');
    }
    if (this.destroyed) return;
    this.refresh();
    try {
      this.zone.runOutsideAngular(() => {
        this.world = new GameWorld(this.worldElement.nativeElement, (point) => {
          if (!this.paused() && !this.panel() && !this.host.state.training) this.walkTo = point;
        });
        this.frame = requestAnimationFrame(this.animate);
      });
      this.ready.set(true);
      if (!this.saveBlocked) await this.save();
    } catch (error) {
      this.error.set(
        `The world could not start. Please use a browser with WebGL enabled. ${error instanceof Error ? error.message : ''}`,
      );
    }
  }

  private readonly animate = (time: number): void => {
    if (this.destroyed) return;
    const dt = this.previousTime ? Math.min((time - this.previousTime) / 1000, 0.1) : 0;
    this.previousTime = time;
    if (!this.paused() && !this.panel() && !document.hidden) {
      let x = 0;
      let z = 0;
      if (this.keys.has('w') || this.keys.has('arrowup')) {
        x -= 0.6;
        z -= 0.8;
      }
      if (this.keys.has('s') || this.keys.has('arrowdown')) {
        x += 0.6;
        z += 0.8;
      }
      if (this.keys.has('a') || this.keys.has('arrowleft')) {
        x -= 0.8;
        z += 0.6;
      }
      if (this.keys.has('d') || this.keys.has('arrowright')) {
        x += 0.8;
        z -= 0.6;
      }
      if (x || z) this.walkTo = null;
      else if (this.walkTo) {
        x = this.walkTo.x - this.host.state.player.position.x;
        z = this.walkTo.z - this.host.state.player.position.z;
        if (Math.hypot(x, z) < 0.18) {
          this.walkTo = null;
          x = 0;
          z = 0;
        }
      }
      if (x || z) this.host.dispatch({ type: 'move', x, z, seconds: dt });
      this.host.update(dt);
      this.saveElapsed += dt;
      if (this.saveElapsed > 8) {
        this.saveElapsed = 0;
        void this.save();
      }
    }
    this.world?.render(this.host.state, dt);
    this.refreshElapsed += dt;
    if (this.refreshElapsed >= 0.08) {
      this.refreshElapsed = 0;
      this.zone.run(() => this.refresh());
    }
    this.frame = requestAnimationFrame(this.animate);
  };

  private refresh(): void {
    this.state.set(structuredClone(this.host.state));
    this.nearby.set(this.host.interaction());
  }
  protected act(action?: string): void {
    if (!this.ready() || this.paused() || this.panel()) return;
    if (this.host.state.training) {
      this.command({ type: 'training-hit' });
      return;
    }
    const interaction = this.host.interaction();
    const selected = action ?? interaction?.actions.find((entry) => !entry.disabled)?.id;
    if (interaction && selected)
      this.command({ type: 'interact', targetId: interaction.id, action: selected });
  }
  private command(command: GameCommand): void {
    this.walkTo = null;
    if (this.host.dispatch(command)) this.chime();
    this.refresh();
    void this.save();
  }
  private readonly keyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    const key = event.key.toLowerCase();
    if (
      ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'e'].includes(
        key,
      )
    ) {
      if (target.tagName === 'BUTTON' && key === ' ') return;
      event.preventDefault();
      this.keys.add(key);
      if (!event.repeat && (key === 'e' || key === ' ')) this.zone.run(() => this.act());
    }
    if (!event.repeat && key === 'escape')
      this.zone.run(() => {
        if (this.panel()) this.openPanel(null);
        else this.togglePause();
      });
    if (!event.repeat && key === 'j')
      this.zone.run(() => this.openPanel(this.panel() === 'journal' ? null : 'journal'));
    if (!event.repeat && key === '`')
      this.zone.run(() => this.openPanel(this.panel() === 'developer' ? null : 'developer'));
  };
  private readonly keyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };
  private readonly blur = (): void => {
    this.keys.clear();
    this.walkTo = null;
  };
  private readonly pageHide = (): void => {
    void this.save();
  };
  private readonly visibility = (): void => {
    this.blur();
    if (document.hidden) void this.save();
  };
  private readonly beforeInstall = (event: Event): void => {
    event.preventDefault();
    this.installPrompt = event as InstallPrompt;
    this.canInstall.set(true);
  };
  protected async install(): Promise<void> {
    await this.installPrompt?.prompt();
    this.canInstall.set(false);
  }
  protected togglePause(): void {
    this.paused.update((value) => !value);
    this.blur();
    void this.save();
  }
  protected openPanel(panel: 'journal' | 'help' | 'developer' | null): void {
    this.panel.set(panel);
    this.resetArmed.set(false);
    this.blur();
  }
  protected direction(key: string, pressed: boolean): void {
    if (pressed) this.keys.add(key);
    else this.keys.delete(key);
  }
  protected toggleSound(): void {
    this.sound.update((value) => !value);
    if (this.sound()) this.chime();
  }
  private chime(): void {
    if (!this.sound()) return;
    this.audio ??= new AudioContext();
    void this.audio.resume();
    const oscillator = this.audio.createOscillator();
    const volume = this.audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, this.audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, this.audio.currentTime + 0.1);
    volume.gain.setValueAtTime(0.05, this.audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.001, this.audio.currentTime + 0.25);
    oscillator.connect(volume);
    volume.connect(this.audio.destination);
    oscillator.start();
    oscillator.stop(this.audio.currentTime + 0.25);
  }
  protected clock(): string {
    const minute = Math.floor(this.state().minute);
    return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
  }
  protected count(itemId: string): number {
    return this.state()
      .inventory.filter((item) => item.itemId === itemId)
      .reduce((total, item) => total + item.quantity, 0);
  }
  protected round(value: number): number {
    return Math.round(value);
  }
  protected completed(flag: string): boolean {
    return this.state().flags.includes(flag);
  }
  protected async save(): Promise<void> {
    if (this.saveBlocked) return;
    try {
      await this.storage.save(this.host.state);
      if (!this.destroyed) this.saveStatus.set('Your homestead is saved');
    } catch {
      this.saveStatus.set('Could not save — keep this tab open');
    }
  }
  protected debug(action: 'next-day' | 'restore'): void {
    this.command({ type: 'debug', action });
  }
  protected async reset(): Promise<void> {
    if (!this.resetArmed()) {
      this.resetArmed.set(true);
      return;
    }
    try {
      await this.storage.clear();
      this.host = new LocalGameHost();
      this.saveBlocked = false;
      this.error.set('');
      this.refresh();
      await this.save();
      this.openPanel(null);
    } catch {
      this.error.set('Could not reset the save. Please check browser storage permissions.');
    }
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.world?.dispose();
    void this.audio?.close();
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.blur);
    window.removeEventListener('pagehide', this.pageHide);
    document.removeEventListener('visibilitychange', this.visibility);
    window.removeEventListener('beforeinstallprompt', this.beforeInstall);
  }
}
