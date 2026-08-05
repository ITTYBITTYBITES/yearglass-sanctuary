/**
 * YearGlass Sanctuary — Environment System
 *
 * Tracks smooth 24-hour ambient light cycle, wind variation, and weather transitions
 * matching recommended settings:
 *   - Weather Change Frequency: Every 20–30 minutes (1200..1800s)
 *   - Weather Transition Length: 60–120s slow fade
 *   - Rain Chance: ~15%
 *   - Overcast Chance: ~20%
 *   - Sunny/Clear Chance: ~65%
 *   - Wind Strength: Low (0.15–0.30)
 *   - Wind Variation: Slow, every 2–5 minutes
 */

export type WeatherType = 'clear' | 'rain' | 'clouds';

export class EnvironmentSystem {
  private hours = 10.0; // 0..24
  private weather: WeatherType = 'clear';
  private targetWeather: WeatherType = 'clear';
  private weatherTimer = 1500; // 20–30 minutes
  private weatherTransitionTimer = 0;
  private weatherTransitionDuration = 90; // 60..120s
  private windStrength = 0.20; // Low (0.15–0.30)
  private windTimer = 180; // 2–5 minutes

  update(dt: number): void {
    // Smooth 24-hour cycle
    this.hours = (this.hours + (dt / 3600)) % 24;

    // Weather change timer
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      this.weatherTimer = 1200 + Math.random() * 600;
      this.weatherTransitionDuration = 60 + Math.random() * 60;
      this.weatherTransitionTimer = this.weatherTransitionDuration;

      const roll = Math.random();
      if (roll < 0.15) {
        this.targetWeather = 'rain';
      } else if (roll < 0.35) {
        this.targetWeather = 'clouds';
      } else {
        this.targetWeather = 'clear';
      }
    }

    // Weather slow fade transition
    if (this.weatherTransitionTimer > 0) {
      this.weatherTransitionTimer -= dt;
      if (this.weatherTransitionTimer <= 0) {
        this.weather = this.targetWeather;
      }
    }

    // Wind variation every 2–5 minutes
    this.windTimer -= dt;
    if (this.windTimer <= 0) {
      this.windTimer = 120 + Math.random() * 180;
      this.windStrength = 0.15 + Math.random() * 0.15;
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

  get currentWind(): number {
    return this.windStrength;
  }

  get isNight(): boolean {
    return this.hours < 6.5 || this.hours >= 19.5;
  }
}
