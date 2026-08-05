/**
 * YearGlass Sanctuary — Environment System
 *
 * Tracks time of day, weather cycles, and room lighting state.
 */

export type WeatherType = 'clear' | 'rain' | 'clouds';

export class EnvironmentSystem {
  private hours = 8.0; // 0..24
  private weather: WeatherType = 'clear';
  private weatherTimer = 120; // seconds before weather change

  update(dt: number): void {
    this.hours = (this.hours + (dt / 120)) % 24; // 1 sanctuary day = 2 minutes
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      this.weatherTimer = 90 + Math.random() * 180;
      const roll = Math.random();
      if (roll < 0.6) this.weather = 'clear';
      else if (roll < 0.85) this.weather = 'rain';
      else this.weather = 'clouds';
    }
  }

  advanceTime(hoursToAdvance: number): void {
    this.hours = (this.hours + hoursToAdvance) % 24;
  }

  get currentHours(): number {
    return this.hours;
  }

  get currentWeather(): WeatherType {
    return this.weather;
  }

  get isNight(): boolean {
    return this.hours < 6.5 || this.hours >= 19.5;
  }
}
