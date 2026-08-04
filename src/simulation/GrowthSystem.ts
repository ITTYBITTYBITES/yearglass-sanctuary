/**
 * YearGlass Sanctuary — Growth System
 *
 * Procedural plant growth and soil moisture ecosystem loop.
 */

export interface PlantNode {
  id: string;
  species: 'moss' | 'fern' | 'orchid' | 'vine';
  growth: number;
  maxGrowth: number;
  water: number;
  x: number;
  y: number;
}

export interface GrowthEvent {
  nodeId: string;
  species: PlantNode['species'];
  growth: number;
  stageName: string;
  milestone: boolean;
  message: string;
}

const GROWTH_RATE: Record<PlantNode['species'], number> = {
  moss: 0.025,
  fern: 0.016,
  orchid: 0.008,
  vine: 0.018,
};

const STAGE_NAMES: Record<PlantNode['species'], string[]> = {
  moss: ['Spore Sprout', 'Velvet Carpet', 'Lush Bed', 'Bioluminescent Peak'],
  fern: ['Fiddlehead', 'Emerging Frond', 'Full Canopy', 'Grand Fern Arch'],
  orchid: ['Seedling Stem', 'Budding Stem', 'Early Bloom', 'Radiant Orchid Bloom'],
  vine: ['Tendril Runner', 'Climbing Stem', 'Cascading Foliage', 'Living Vine Curtain'],
};

export class GrowthSystem {
  private readonly plants = new Map<string, PlantNode>();
  private nextId = 0;
  private soilMoisture = 0.85;

  addPlant(species: PlantNode['species'], x: number, y: number): PlantNode {
    const node: PlantNode = {
      id: `plant-${this.nextId++}`,
      species,
      growth: 0.08 + Math.random() * 0.12,
      maxGrowth: 0.95 + Math.random() * 0.1,
      water: 0.85,
      x,
      y,
    };
    this.plants.set(node.id, node);
    return node;
  }

  tickDay(): GrowthEvent[] {
    const events: GrowthEvent[] = [];
    this.soilMoisture = Math.max(0.15, this.soilMoisture - 0.06);

    for (const node of this.plants.values()) {
      node.water = Math.min(node.water, this.soilMoisture);
      if (this.soilMoisture > 0.2) {
        const beforeStage = Math.floor(node.growth / 0.25);
        const delta = GROWTH_RATE[node.species] * (0.7 + Math.random() * 0.6) * (this.soilMoisture > 0.5 ? 1.2 : 0.8);
        node.growth = Math.min(node.maxGrowth, node.growth + delta);
        const afterStage = Math.floor(node.growth / 0.25);

        if (afterStage > beforeStage && afterStage <= 3) {
          const stages = STAGE_NAMES[node.species];
          const stageName = stages[Math.min(afterStage, stages.length - 1)];
          const speciesCapitalized = node.species.charAt(0).toUpperCase() + node.species.slice(1);
          const message = `The ${speciesCapitalized} reached stage ${afterStage + 1}: ${stageName}!`;

          events.push({
            nodeId: node.id,
            species: node.species,
            growth: node.growth,
            stageName,
            milestone: true,
            message,
          });
        }
      }
    }
    return events;
  }

  waterPlants(amount = 0.35): string {
    this.soilMoisture = Math.min(1.0, this.soilMoisture + amount);
    for (const node of this.plants.values()) {
      node.water = Math.min(1.0, node.water + amount);
    }
    return `Care given: Soil moisture restored to ${Math.round(this.soilMoisture * 100)}%.`;
  }

  get moisture(): number {
    return this.soilMoisture;
  }

  getPlant(id: string): PlantNode | undefined {
    return this.plants.get(id);
  }

  allPlants(): PlantNode[] {
    return Array.from(this.plants.values());
  }

  plantCount(): number {
    return this.plants.size;
  }

  toJSON(): Record<string, unknown> {
    return {
      nextId: this.nextId,
      soilMoisture: this.soilMoisture,
      plants: Array.from(this.plants.values()),
    };
  }

  fromJSON(data: { nextId?: number; soilMoisture?: number; plants?: PlantNode[] }): void {
    if (typeof data.nextId === 'number') this.nextId = data.nextId;
    if (typeof data.soilMoisture === 'number') this.soilMoisture = data.soilMoisture;
    if (Array.isArray(data.plants)) {
      this.plants.clear();
      for (const p of data.plants) {
        this.plants.set(p.id, p);
      }
    }
  }
}
