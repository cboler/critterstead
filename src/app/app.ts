import { backpack, satchel } from './game/model';
import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { AREAS } from './game/content';
import { calendarDate, calendarView, capitalize, weatherFor } from './game/calendar';
import { LocalGameHost } from './game/host';
import { activeCritter, GameCommand, GameState, Interaction, Point } from './game/model';
import { IndexedDbStorage } from './game/storage';
import { encumbrance } from './game/checks';
import { GameWorld } from './game/world';
import {
  storedQualityChoice,
  storeQualityChoice,
  type Quality,
  type QualityChoice,
} from './game/render/quality';

type Panel = 'journal' | 'help' | 'developer' | 'calendar';

/** Whether the details panel sits beside the world rather than over it. */
function sidePanelLayout(): boolean {
  return window.matchMedia?.('(min-width: 900px) and (min-height: 561px)').matches ?? true;
}

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
  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);
  private host = new LocalGameHost();
  private readonly storage = new IndexedDbStorage();
  private world?: GameWorld;
  private frame = 0;
  private previousTime = 0;
  private refreshElapsed = 0;
  private saveElapsed = 0;
  private readonly keys = new Set<string>();
  private gamepadButtons: boolean[] = [];
  private walkTo: Point | null = null;
  private destroyed = false;
  private saveBlocked = false;
  private releaseOwnership?: () => void;
  private audio?: AudioContext;
  private installPrompt?: InstallPrompt;
  protected readonly state = signal<GameState>(structuredClone(this.host.state));
  protected readonly nearby = signal<Interaction | null>(null);
  protected readonly companion = computed(() => activeCritter(this.state()));
  protected readonly ready = signal(false);
  protected readonly paused = signal(false);
  protected readonly panel = signal<Panel | null>(null);
  protected readonly saveStatus = signal('Opening your homestead…');
  protected readonly error = signal('');
  protected readonly sound = signal(false);
  protected readonly canInstall = signal(false);
  protected readonly resetArmed = signal(false);
  protected readonly sessionBusy = signal(false);
  protected readonly controllerConnected = signal(false);
  protected readonly gamepadAction = signal<string | null>(null);
  protected readonly learning = signal(this.host.learning());
  protected readonly hauling = signal(this.host.haulingLearning());
  protected readonly learningSteps = Array.from({ length: this.learning().goal }, (_, i) => i + 1);
  protected readonly bag = computed(() => backpack(this.state()));
  protected readonly companionBag = computed(() => satchel(this.state()));
  protected readonly load = computed(() =>
    encumbrance(this.state().player, backpack(this.state()).items),
  );
  protected readonly rancherSkills = [
    'woodcutting',
    'mining',
    'hauling',
    'foraging',
    'farming',
  ] as const;
  protected readonly calendar = computed(() => calendarView(this.state()));
  protected readonly date = computed(() => calendarDate(this.state().day));
  protected readonly weatherIcons = { sunny: '☀', cloudy: '☁', rain: '☂', snow: '❄' } as const;
  protected readonly capitalize = capitalize;
  protected readonly activityCopy = computed(() => {
    const activity = this.state().training;
    const name = this.companion().name;
    const beats = 'when the marker reaches the green patch.';
    if (!activity)
      return { eyebrow: '', heading: '', instructions: '', button: '', status: '', gauge: null };
    if (activity.kind === 'lift' || (activity.kind === 'exhibition' && activity.stage === 1))
      return {
        eyebrow: activity.kind === 'lift' ? 'BOULDER LIFT' : 'THE EXHIBITION · STONE PULL',
        heading: activity.kind === 'lift' ? 'Steady strength' : 'Pull, ' + name + ', pull!',
        instructions: 'to push the gauge up. Keep it in the green until the hold fills.',
        button: 'Push, ' + name + '!',
        status: Math.round(activity.elapsed) + 's',
        gauge: 'lift' as const,
      };
    if (activity.kind === 'pace')
      return {
        eyebrow: 'DISTANCE PACING',
        heading: 'Find a pace you can keep',
        instructions: 'to speed up. Above the green you spend breath; run dry and you are winded.',
        button: 'Pace!',
        status: Math.round(activity.elapsed) + 's',
        gauge: 'pace' as const,
      };
    return {
      eyebrow:
        activity.kind === 'race'
          ? 'THE CLOVER CUP'
          : activity.kind === 'exhibition'
            ? 'THE EXHIBITION · SPRINT'
            : 'A LITTLE PRACTICE',
      heading:
        activity.kind === 'race'
          ? 'Cheer ' + name + ' across the line!'
          : activity.kind === 'exhibition'
            ? 'Sprint for the crowd!'
            : 'Find your rhythm together',
      instructions: beats,
      button:
        activity.kind === 'race'
          ? 'Cheer!'
          : activity.kind === 'exhibition'
            ? 'Sprint!'
            : 'Hop, ' + name + '!',
      status: '',
      gauge: null,
    };
  });
  protected weather() {
    return weatherFor(this.state().day);
  }
  protected dropCargo(): void {
    this.command({ type: 'drop-cargo' });
  }
  protected readonly areas = AREAS;
  // Wide screens open the details panel beside the world; phones start with a compact chip.
  protected readonly railOpen = signal(sidePanelLayout());
  protected readonly railTab = signal<'companion' | 'rancher'>('companion');
  protected readonly qualityChoice = signal<QualityChoice>(storedQualityChoice());
  protected readonly quality = signal<Quality>('balanced');
  protected readonly rendererName = signal('');
  protected readonly qualityOptions: { id: QualityChoice; label: string }[] = [
    { id: 'auto', label: 'Auto' },
    { id: 'cinematic', label: 'Cinematic' },
    { id: 'balanced', label: 'Balanced' },
    { id: 'light', label: 'Light' },
  ];
  private insetElapsed = 1;
  protected readonly statNames = ['strength', 'endurance', 'speed', 'intelligence'] as const;
  protected readonly goals = [
    {
      flag: 'cared',
      title: 'A little care',
      description: 'Spend a moment caring for your companion.',
    },
    { flag: 'trained', title: 'Find your rhythm', description: 'Try the training hoop together.' },
    {
      flag: 'gathered',
      title: 'Beyond the garden gate',
      description: 'Pick sunberries in the glade.',
    },
    {
      flag: 'improved',
      title: 'Room to grow',
      description: 'Sell berries and mend the companion nook.',
    },
  ];

  async ngAfterViewInit(): Promise<void> {
    // Only one local authority may write the same homestead at a time.
    if (navigator.locks) {
      const ownsSave = await new Promise<boolean>((resolve, reject) => {
        void navigator.locks
          .request('critterstead-active-game', { ifAvailable: true }, (lock) => {
            resolve(!!lock);
            if (!lock) return;
            return new Promise<void>((release) => {
              this.releaseOwnership = release;
            });
          })
          .catch(reject);
      });
      if (this.destroyed) {
        this.releaseOwnership?.();
        return;
      }
      if (!ownsSave) {
        this.saveBlocked = true;
        this.sessionBusy.set(true);
        this.error.set(
          'Your homestead is open in another tab. Close that tab and reload this one to continue.',
        );
        this.saveStatus.set('Open in another tab');
        return;
      }
    }
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.blur);
    window.addEventListener('pagehide', this.pageHide);
    document.addEventListener('visibilitychange', this.visibility);
    window.addEventListener('beforeinstallprompt', this.beforeInstall);
    window.addEventListener('gamepadconnected', this.controllerChange);
    window.addEventListener('gamepaddisconnected', this.controllerChange);
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
        this.world = new GameWorld(
          this.worldElement.nativeElement,
          (point) => {
            if (!this.paused() && !this.panel() && !this.host.state.training) this.walkTo = point;
          },
          this.qualityChoice(),
        );
        this.frame = requestAnimationFrame(this.animate);
      });
      this.quality.set(this.world!.quality);
      this.rendererName.set(this.world!.gpu);
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
    const stick = document.hidden ? { x: 0, z: 0 } : this.pollGamepad();
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
      x += stick.x;
      z += stick.z;
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
      const previousJournal = this.host.state.journal;
      const previousDay = this.host.state.day;
      this.host.update(dt);
      this.saveElapsed += dt;
      if (
        this.saveElapsed > 8 ||
        previousJournal !== this.host.state.journal ||
        previousDay !== this.host.state.day
      ) {
        this.saveElapsed = 0;
        void this.save();
      }
    }
    this.insetElapsed += dt;
    if (this.insetElapsed >= 0.2) {
      this.insetElapsed = 0;
      this.measureInsets();
    }
    this.world?.render(this.host.state, dt);
    this.refreshElapsed += dt;
    if (this.refreshElapsed >= (this.host.state.training ? 1 / 60 : 0.1)) {
      this.refreshElapsed = 0;
      this.zone.run(() => this.refresh());
    }
    this.frame = requestAnimationFrame(this.animate);
  };

  private refresh(): void {
    this.learning.set(this.host.learning());
    this.hauling.set(this.host.haulingLearning());
    this.state.set(structuredClone(this.host.state));
    const interaction = this.host.interaction();
    this.nearby.set(interaction);
    if (
      !interaction?.actions.some((action) => action.id === this.gamepadAction() && !action.disabled)
    )
      this.gamepadAction.set(null);
  }

  private readonly controllerChange = (): void => {
    this.zone.run(() =>
      this.controllerConnected.set(!!navigator.getGamepads?.().find((pad) => pad?.connected)),
    );
  };

  private pollGamepad(): Point {
    const pad = navigator.getGamepads?.().find((candidate) => candidate?.connected);
    if (this.controllerConnected() !== !!pad)
      this.zone.run(() => this.controllerConnected.set(!!pad));
    if (!pad) {
      this.gamepadButtons = [];
      return { x: 0, z: 0 };
    }
    const pressed = pad.buttons.map((button) => button.pressed);
    const newlyPressed = pressed.map((value, index) => value && !this.gamepadButtons[index]);
    const edge = (index: number) => newlyPressed[index];
    this.gamepadButtons = pressed;
    if (edge(9))
      this.zone.run(() => {
        if (this.panel()) this.openPanel(null);
        else this.togglePause();
      });
    if (edge(1))
      this.zone.run(() => {
        if (this.panel()) this.openPanel(null);
        else if (this.paused()) this.togglePause();
        else this.clearGamepadSelection();
      });
    if (edge(2)) this.zone.run(() => this.openPanel(this.panel() === 'help' ? null : 'help'));
    if (edge(3)) this.zone.run(() => this.openPanel(this.panel() === 'journal' ? null : 'journal'));
    if (edge(12) || edge(14)) this.zone.run(() => this.navigateGamepad(-1));
    if (edge(13) || edge(15)) this.zone.run(() => this.navigateGamepad(1));
    if (edge(0)) this.zone.run(() => this.activateGamepad());
    if (this.paused() || this.panel() || this.host.state.training) return { x: 0, z: 0 };
    const horizontal = pad.axes[0] ?? 0;
    const vertical = pad.axes[1] ?? 0;
    if (Math.hypot(horizontal, vertical) < 0.18) return { x: 0, z: 0 };
    return { x: horizontal * 0.8 + vertical * 0.6, z: vertical * 0.8 - horizontal * 0.6 };
  }

  private clearGamepadSelection(): void {
    this.gamepadAction.set(null);
    this.element.nativeElement
      .querySelectorAll('.pad-selected')
      .forEach((button) => button.classList.remove('pad-selected'));
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  private navigateGamepad(step: number): void {
    if (this.panel()) {
      const buttons = Array.from(
        this.element.nativeElement.querySelectorAll<HTMLButtonElement>(
          '.journal-modal button:not(:disabled)',
        ),
      );
      if (!buttons.length) return;
      const selected = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = buttons[(selected + step + buttons.length) % buttons.length];
      buttons.forEach((button) => button.classList.remove('pad-selected'));
      next.classList.add('pad-selected');
      next.focus();
      return;
    }
    if (this.paused()) {
      this.element.nativeElement.querySelector<HTMLButtonElement>('.pause-message button')?.focus();
      return;
    }
    if (this.host.state.training) {
      this.element.nativeElement.querySelector<HTMLButtonElement>('.training-card button')?.focus();
      return;
    }
    const actions = this.host.interaction()?.actions.filter((action) => !action.disabled) ?? [];
    if (!actions.length) return;
    const selected = actions.findIndex((action) => action.id === this.gamepadAction());
    const next =
      actions[
        selected < 0
          ? step < 0
            ? actions.length - 1
            : 0
          : (selected + step + actions.length) % actions.length
      ];
    this.gamepadAction.set(next.id);
    const all = this.host.interaction()?.actions ?? [];
    const buttons = this.element.nativeElement.querySelectorAll<HTMLButtonElement>(
      '.interaction-actions button',
    );
    buttons[all.findIndex((action) => action.id === next.id)]?.focus();
  }

  private activateGamepad(): void {
    if (this.panel()) {
      const focused = document.activeElement;
      if (
        focused instanceof HTMLButtonElement &&
        this.element.nativeElement.querySelector('.journal-modal')?.contains(focused)
      )
        focused.click();
      return;
    }
    if (this.paused()) {
      this.togglePause();
      return;
    }
    if (this.host.state.training) {
      this.act();
      return;
    }
    const action = this.host
      .interaction()
      ?.actions.find((item) => item.id === this.gamepadAction() && !item.disabled);
    this.act(action?.id);
  }
  protected act(action?: string): void {
    if (!this.ready() || this.paused() || this.panel()) return;
    if (this.host.state.training) {
      this.command({ type: 'training-hit' });
      return;
    }
    const interaction = this.host.interaction();
    const selected = action ?? interaction?.actions.find((entry) => !entry.disabled)?.id;
    if (interaction && selected) {
      const done = this.command({ type: 'interact', targetId: interaction.id, action: selected });
      if (done && selected === 'read-calendar') this.openPanel('calendar');
    }
  }
  private command(command: GameCommand): boolean {
    this.walkTo = null;
    const done = this.host.dispatch(command);
    if (done) this.chime();
    // Touch arrows unmount during activities, so a held arrow would never report release.
    if (this.host.state.training) this.keys.clear();
    this.refresh();
    void this.save();
    return done;
  }
  private readonly keyDown = (event: KeyboardEvent): void => {
    if (this.panel() && event.key === 'Tab') {
      const buttons = Array.from(
        this.element.nativeElement.querySelectorAll<HTMLButtonElement>(
          '.journal-modal button:not(:disabled)',
        ),
      );
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
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
    if (!this.panel() && ['=', '+', '-', '_'].includes(key)) {
      event.preventDefault();
      this.zoom(key === '=' || key === '+' ? -1 : 1);
    }
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
  protected toggleRail(): void {
    this.railOpen.update((open) => !open);
  }
  /** Negative steps zoom in, positive steps zoom out. */
  protected zoom(step: number): void {
    this.world?.zoomBy(step < 0 ? 0.82 : 1.22);
  }
  protected setQuality(choice: QualityChoice): void {
    this.qualityChoice.set(choice);
    storeQualityChoice(choice);
    this.world?.setQuality(choice);
    if (this.world) this.quality.set(this.world.quality);
  }
  /** Tells the camera which screen edges HUD panels cover, so the rancher stays in view. */
  private measureInsets(): void {
    const shell = this.element.nativeElement.querySelector<HTMLElement>('.game-shell');
    if (!shell || !this.world) return;
    const box = (selector: string) => shell.querySelector(selector)?.getBoundingClientRect();
    const height = window.innerHeight;
    const width = window.innerWidth;
    const top = Math.max(box('.masthead')?.bottom ?? 0, box('.day-bar')?.bottom ?? 0);
    const covering = ['.satchel-bar', '.interaction-dock', '.training-card']
      .map((selector) => box(selector))
      .filter((rect): rect is DOMRect => !!rect && rect.height > 0)
      .map((rect) => rect.top);
    const bottom = height - Math.min(height, ...covering);
    const rail = box('.side-rail');
    const right =
      this.railOpen() && sidePanelLayout() && rail && rail.width > 0 ? width - rail.left : 0;
    const dock = box('.interaction-dock');
    shell.style.setProperty('--dock-h', `${Math.round(dock?.height ?? 0)}px`);
    this.world.setInsets({ top, right, bottom, left: 0 });
  }
  protected togglePause(): void {
    this.paused.update((value) => !value);
    this.blur();
    void this.save();
  }
  protected openPanel(panel: Panel | null): void {
    this.panel.set(panel);
    this.resetArmed.set(false);
    this.blur();
    this.clearGamepadSelection();
    if (panel)
      setTimeout(() =>
        this.element.nativeElement
          .querySelector<HTMLButtonElement>('.journal-modal button')
          ?.focus(),
      );
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
    return backpack(this.state())
      .items.filter((item) => item.itemId === itemId)
      .reduce((total, item) => total + item.quantity, 0);
  }
  protected round(value: number): number {
    return Math.round(value);
  }
  protected completed(flag: string): boolean {
    return this.state().flags.includes(flag);
  }
  protected primaryAction(id: string): boolean {
    return this.nearby()?.actions.find((action) => !action.disabled)?.id === id;
  }
  protected blockedReason(): string {
    const actions = this.nearby()?.actions ?? [];
    return actions.every((action) => action.disabled) ? (actions[0]?.reason ?? '') : '';
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
    if (this.sessionBusy()) return;
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
    this.releaseOwnership?.();
    void this.audio?.close();
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.blur);
    window.removeEventListener('pagehide', this.pageHide);
    document.removeEventListener('visibilitychange', this.visibility);
    window.removeEventListener('beforeinstallprompt', this.beforeInstall);
    window.removeEventListener('gamepadconnected', this.controllerChange);
    window.removeEventListener('gamepaddisconnected', this.controllerChange);
  }
}
