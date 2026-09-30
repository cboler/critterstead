import { calendarDate, capitalize, nextDawn, weatherFor } from './calendar';
import { CROPS } from './content';
import { SoilPlot } from './model';

export function plotReady(plot: SoilPlot): boolean {
  return (
    !!plot.crop &&
    !plot.crop.withered &&
    plot.crop.growthMinutes >= CROPS[plot.crop.speciesId].growthMinutes
  );
}

/**
 * Grows moist beds between two absolute minutes. At each dawn, morning rain soaks tilled
 * beds and crops outside their seasons wither. Returns notes for the household journal.
 */
export function advanceGarden(plots: SoilPlot[], from: number, to: number): string[] {
  const notes: string[] = [];
  let time = from;
  while (time < to) {
    const dawn = nextDawn(time);
    const until = Math.min(to, dawn);
    for (const plot of plots) {
      const crop = plot.crop;
      if (!crop || crop.withered) continue;
      const moist = Math.max(0, Math.min(until, plot.moistUntil) - time);
      crop.growthMinutes = Math.min(
        CROPS[crop.speciesId].growthMinutes,
        crop.growthMinutes + moist,
      );
    }
    time = until;
    if (time !== dawn) break;
    const day = Math.floor(dawn / 1440) + 1;
    const season = calendarDate(day).season;
    plots.forEach((plot, index) => {
      const crop = plot.crop;
      if (!crop || crop.withered || CROPS[crop.speciesId].seasons.includes(season)) return;
      crop.withered = true;
      notes.push(
        `${capitalize(season)} arrives; the ${CROPS[crop.speciesId].name.toLowerCase()} in bed ${index + 1} wither out of season.`,
      );
    });
    if (weatherFor(day) === 'rain' && plots.some((plot) => plot.tilled)) {
      for (const plot of plots) if (plot.tilled) plot.moistUntil = dawn + 1440;
      notes.push('Morning rain soaks the tilled garden beds.');
    }
  }
  return notes;
}
