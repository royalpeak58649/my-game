import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects, type GeoProjection } from 'd3-geo';
import { feature, mesh, neighbors } from 'topojson-client';
import type { CountryDef, StateDef } from '../../sim/types';
import type { MapMode, Store } from '../store';

/**
 * Minimal structural view of the TopoJSON file we consume. Declared locally so
 * we do not depend on transitive type packages.
 */
interface TopoGeometry {
  type: string;
  id?: string | number;
  arcs?: unknown;
  geometries?: TopoGeometry[];
}

interface WorldTopology {
  type: 'Topology';
  objects: { states: TopoGeometry };
  arcs: unknown;
  transform?: { scale: [number, number]; translate: [number, number] };
}

interface StateFeature {
  type: 'Feature';
  id: string;
  properties: { id: string };
  geometry: unknown; // GeoJSON geometry (lon/lat coordinates)
}

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface StateShape {
  id: string;
  path: Path2D;
  bbox: BBox;
}

interface LabelEntry {
  tag: string;
  name: string;
  x: number;
  y: number;
  area: number;
  /** Projected bounding box of all states of the country. */
  bbox: BBox;
}

interface View {
  scale: number;
  tx: number;
  ty: number;
}

const SEA_COLOR = '#9db4c0';
const GRATICULE_COLOR = 'rgba(255, 255, 255, 0.16)';
const DECENTRALIZED_COLOR = '#d9d0b8';
const HATCH_COLOR = 'rgba(120, 104, 74, 0.28)';
const COUNTRY_BORDER_COLOR = '#2a2118';
const COAST_COLOR = '#3d4a52';
const STATE_BORDER_COLOR = 'rgba(42, 33, 24, 0.45)';
const HOVER_COLOR = 'rgba(255, 255, 255, 0.28)';
const SELECT_COLOR = '#ffe9a8';
const LABEL_COLOR = '#1d2533';
const LABEL_HALO = 'rgba(239, 230, 210, 0.85)';

const MIN_SCALE = 1;
const MAX_SCALE = 40;
const DRAG_THRESHOLD = 4;

/** Deterministic pastel colour for the debug "states" map mode. */
function pastelFor(id: string): string {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hue = (hash >>> 0) % 360;
  const sat = 42 + ((hash >>> 9) % 18);
  const light = 74 + ((hash >>> 17) % 10);
  return `hsl(${hue} ${sat}% ${light}%)`;
}

function emptyBBox(): BBox {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}

function bboxIsValid(b: BBox): boolean {
  return Number.isFinite(b.minX) && Number.isFinite(b.minY) && b.maxX >= b.minX && b.maxY >= b.minY;
}

function bboxContains(b: BBox, x: number, y: number): boolean {
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
}

function bboxCenter(b: BBox): [number, number] {
  return [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
}

function bboxSpan(b: BBox): number {
  return Math.max(b.maxX - b.minX, b.maxY - b.minY);
}

/** A Path2D-compatible sink that also tracks the bounding box of what it draws. */
class BBoxPath2D extends Path2D {
  readonly bbox: BBox = emptyBBox();

  private track(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (x < this.bbox.minX) this.bbox.minX = x;
    if (y < this.bbox.minY) this.bbox.minY = y;
    if (x > this.bbox.maxX) this.bbox.maxX = x;
    if (y > this.bbox.maxY) this.bbox.maxY = y;
  }

  override moveTo(x: number, y: number): void {
    this.track(x, y);
    super.moveTo(x, y);
  }

  override lineTo(x: number, y: number): void {
    this.track(x, y);
    super.lineTo(x, y);
  }

  override bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ): void {
    this.track(cp1x, cp1y);
    this.track(cp2x, cp2y);
    this.track(x, y);
    super.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  }

  override quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.track(cpx, cpy);
    this.track(x, y);
    super.quadraticCurveTo(cpx, cpy, x, y);
  }

  override arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ): void {
    this.track(x - radius, y - radius);
    this.track(x + radius, y + radius);
    super.arc(x, y, radius, startAngle, endAngle, counterclockwise ?? false);
  }

  override arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
    this.track(x1, y1);
    this.track(x2, y2);
    super.arcTo(x1, y1, x2, y2, radius);
  }

  override rect(x: number, y: number, w: number, h: number): void {
    this.track(x, y);
    this.track(x + w, y + h);
    super.rect(x, y, w, h);
  }

  override ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ): void {
    this.track(x - rx, y - ry);
    this.track(x + rx, y + ry);
    super.ellipse(x, y, rx, ry, rotation, startAngle, endAngle, counterclockwise ?? false);
  }
}

/**
 * Canvas map renderer: precomputed per-state Path2D geometry in projected
 * (unzoomed) coordinates, pan/zoom, hit testing and country labels.
 */
export class MapView {
  private readonly store: Store;
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  private readonly projection: GeoProjection;
  private readonly shapes = new Map<string, StateShape>();
  private readonly labels: LabelEntry[] = [];
  private readonly countryBorders: Path2D;
  private readonly coastlines: Path2D;
  private readonly stateBorders: Path2D;
  private readonly graticule: Path2D;

  private view: View = { scale: 1, tx: 0, ty: 0 };
  private worldWidth = 1;
  private width = 0;
  private height = 0;
  private dpr = 1;

  private dirty = true;
  private frame: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private dragging = false;
  private dragMoved = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartTx = 0;
  private dragStartTy = 0;

  private readonly unsubscribers: (() => void)[] = [];

  constructor(store: Store, container: HTMLElement, world: unknown) {
    this.store = store;
    this.container = container;

    const canvas = document.createElement('canvas');
    canvas.className = 'map-canvas';
    container.appendChild(canvas);
    this.canvas = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;

    this.projection = geoNaturalEarth1();
    const topology = world as WorldTopology;
    const collection = this.buildFeatures(topology);

    this.fitProjection(collection);
    this.buildShapes(collection);
    // mesh() calls the filter with the two geometries sharing an arc; a === b means
    // the arc is only used once, i.e. it is a coastline.
    this.countryBorders = this.buildMesh(topology, (a, b, oa, ob) => a !== b && oa !== ob);
    this.coastlines = this.buildMesh(topology, (a, b) => a === b);
    this.stateBorders = this.buildMesh(topology, (a, b, oa, ob) => a !== b && oa === ob);
    this.graticule = this.buildGraticule();
    this.buildLabels(topology);

    this.attachEvents();
    this.observeResize();
    this.resize();

    this.unsubscribers.push(store.subscribeUi(() => this.invalidate()));
  }

  // ---------------------------------------------------------------- geometry

  private buildFeatures(topology: WorldTopology): StateFeature[] {
    // Convert TopoJSON arcs into GeoJSON features with real coordinates.
    const fc = feature(
      topology as unknown as Parameters<typeof feature>[0],
      topology.objects.states as unknown as Parameters<typeof feature>[1],
    ) as unknown as { features: { id?: string | number; geometry: { type: string } | null }[] };
    const features: StateFeature[] = [];
    for (const f of fc.features) {
      if (!f.geometry || f.id === undefined) continue;
      if (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon') continue;
      const id = String(f.id);
      features.push({ type: 'Feature', id, properties: { id }, geometry: f.geometry });
    }
    return features;
  }

  private fitProjection(features: StateFeature[]): void {
    const collection = { type: 'FeatureCollection' as const, features };
    const worldWidth = Math.max(1, this.container.clientWidth || window.innerWidth);
    this.worldWidth = worldWidth;
    this.projection.fitWidth(worldWidth, collection as unknown as GeoPermissibleObjects);
  }

  private buildShapes(features: StateFeature[]): void {
    const path = geoPath(this.projection);
    for (const feature of features) {
      const id = feature.properties.id;
      const sink = new BBoxPath2D();
      path.context(sink as unknown as CanvasRenderingContext2D)(feature as unknown as GeoPermissibleObjects);
      if (!bboxIsValid(sink.bbox)) continue;
      this.shapes.set(id, { id, path: sink, bbox: sink.bbox });
    }
  }

  private buildMesh(
    topology: WorldTopology,
    filter: (a: TopoGeometry, b: TopoGeometry, ownerA: string, ownerB: string) => boolean,
  ): Path2D {
    const states = this.store.get().states;
    // decentralized lands share a pseudo-owner so they get thin borders between them
    const ownerOf = (g: TopoGeometry): string => states[String(g.id)]?.owner ?? '-';
    const meshObject = mesh(
      topology as unknown as Parameters<typeof mesh>[0],
      topology.objects.states as unknown as Parameters<typeof mesh>[1],
      (a, b) => {
        const ga = a as unknown as TopoGeometry;
        const gb = b as unknown as TopoGeometry;
        return filter(ga, gb, ownerOf(ga), ownerOf(gb));
      },
    );
    const sink = new Path2D();
    geoPath(this.projection, sink as unknown as CanvasRenderingContext2D)(
      meshObject as unknown as GeoPermissibleObjects,
    );
    return sink;
  }

  private buildGraticule(): Path2D {
    const sink = new Path2D();
    const path = geoPath(this.projection, sink as unknown as CanvasRenderingContext2D);
    const step = 20;
    for (let lon = -180; lon <= 180; lon += step) {
      const line: [number, number][] = [];
      for (let lat = -80; lat <= 80; lat += 5) line.push([lon, lat]);
      path({ type: 'LineString', coordinates: line });
    }
    for (let lat = -60; lat <= 60; lat += step) {
      const line: [number, number][] = [];
      for (let lon = -180; lon <= 180; lon += 5) line.push([lon, lat]);
      path({ type: 'LineString', coordinates: line });
    }
    return sink;
  }

  /**
   * One label per contiguous block of a country's territory: always the block that
   * contains the capital, plus any other block large enough to deserve its own name
   * (e.g. British North America). Blocks are found from shared state borders.
   */
  private buildLabels(topology: WorldTopology): void {
    const game = this.store.get();
    const geoms = topology.objects.states.geometries ?? [];
    const ids = geoms.map((g) => String(g.id));
    const adj = neighbors(geoms as unknown as Parameters<typeof neighbors>[0]);
    const SECONDARY_MIN_AREA = 400_000; // km²

    const seen = new Set<number>();
    for (let i = 0; i < ids.length; i += 1) {
      const owner = game.states[ids[i] ?? '']?.owner;
      if (seen.has(i) || !owner) continue;
      // flood fill over same-owner neighbours
      const block: number[] = [];
      const stack = [i];
      seen.add(i);
      while (stack.length) {
        const k = stack.pop() as number;
        block.push(k);
        for (const n of adj[k] ?? []) {
          if (!seen.has(n) && game.states[ids[n] ?? '']?.owner === owner) {
            seen.add(n);
            stack.push(n);
          }
        }
      }
      const country = game.countries[owner];
      if (!country) continue;
      let area = 0, sx = 0, sy = 0, hasCapital = false;
      const bbox = emptyBBox();
      for (const k of block) {
        const id = ids[k] ?? '';
        const shape = this.shapes.get(id);
        const def = game.states[id];
        if (!shape || !def) continue;
        if (id === country.capital) hasCapital = true;
        const w = Math.max(1, def.area);
        // Use the projected geographic centroid: a state crossing the antimeridian
        // (e.g. Alaska with the Aleutians) has a world-wide projected bbox.
        const projected = this.projection(def.centroid);
        if (!projected) continue;
        const [cx, cy] = projected;
        area += w; sx += cx * w; sy += cy * w;
        const b = bboxSpan(shape.bbox) > this.worldWidth / 2 ? { minX: cx, minY: cy, maxX: cx, maxY: cy } : shape.bbox;
        bbox.minX = Math.min(bbox.minX, b.minX);
        bbox.minY = Math.min(bbox.minY, b.minY);
        bbox.maxX = Math.max(bbox.maxX, b.maxX);
        bbox.maxY = Math.max(bbox.maxY, b.maxY);
      }
      if (!area || (!hasCapital && area < SECONDARY_MIN_AREA)) continue;
      this.labels.push({ tag: owner, name: country.name, x: sx / area, y: sy / area, area, bbox });
    }
    this.labels.sort((a, b) => b.area - a.area);
  }

  // ------------------------------------------------------------------ layout

  private observeResize(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.container);
    }
    window.addEventListener('resize', this.handleWindowResize);
  }

  private readonly handleWindowResize = (): void => {
    this.resize();
  };

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = window.devicePixelRatio || 1;
    if (width === this.width && height === this.height && dpr === this.dpr) return;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.clampView();
    this.invalidate();
  }

  // ------------------------------------------------------------------- view

  private clampView(): void {
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.view.scale));
    const worldWidth = this.projection.scale() * 2 * Math.PI;
    const worldHeight = worldWidth / 2;
    const minTx = Math.min(0, this.width - worldWidth * scale);
    const minTy = Math.min(0, this.height - worldHeight * scale);
    const tx = Math.min(0, Math.max(minTx, this.view.tx));
    const ty = Math.min(0, Math.max(minTy, this.view.ty));
    this.view = { scale, tx, ty };
  }

  private toWorld(sx: number, sy: number): [number, number] {
    return [(sx - this.view.tx) / this.view.scale, (sy - this.view.ty) / this.view.scale];
  }

  /** Zooms toward a screen point, keeping that point fixed. */
  zoomAt(screenX: number, screenY: number, factor: number): void {
    const [wx, wy] = this.toWorld(screenX, screenY);
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.view.scale * factor));
    this.view = {
      scale,
      tx: screenX - wx * scale,
      ty: screenY - wy * scale,
    };
    this.clampView();
    this.invalidate();
  }

  /** Pans and zooms so that the given state fills a comfortable part of the view. */
  focusState(stateId: string, targetScale = 6): void {
    const shape = this.shapes.get(stateId);
    if (!shape) return;
    const [cx, cy] = bboxCenter(shape.bbox);
    const span = Math.max(8, bboxSpan(shape.bbox));
    const fit = Math.min(this.width, this.height) / (span * 2.2);
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(targetScale, fit)));
    this.view = {
      scale,
      tx: this.width / 2 - cx * scale,
      ty: this.height / 2 - cy * scale,
    };
    this.clampView();
    this.invalidate();
  }

  /** Resets to the whole-world view. */
  resetView(): void {
    this.view = { scale: 1, tx: 0, ty: 0 };
    this.clampView();
    this.invalidate();
  }

  // ----------------------------------------------------------------- events

  private attachEvents(): void {
    const canvas = this.canvas;
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerUp);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.dragging = true;
    this.dragMoved = false;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragStartTx = this.view.tx;
    this.dragStartTy = this.view.ty;
    this.canvas.setPointerCapture(event.pointerId);
    this.canvas.classList.add('is-dragging');
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;

    if (this.dragging) {
      const dx = event.clientX - this.dragStartX;
      const dy = event.clientY - this.dragStartY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) this.dragMoved = true;
      if (this.dragMoved) {
        this.view = { scale: this.view.scale, tx: this.dragStartTx + dx, ty: this.dragStartTy + dy };
        this.clampView();
        this.invalidate();
      }
      return;
    }

    const hit = this.hitTest(sx, sy);
    if (hit !== this.store.getUi().hoveredStateId) {
      this.store.setUi({ hoveredStateId: hit });
    }
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (!this.dragging) return;
    this.dragging = false;
    this.canvas.classList.remove('is-dragging');
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    if (this.dragMoved) return;

    const rect = this.canvas.getBoundingClientRect();
    const hit = this.hitTest(event.clientX - rect.left, event.clientY - rect.top);
    if (hit === null) {
      this.store.setUi({ selectedStateId: null, selectedCountryTag: null });
      return;
    }
    const def = this.store.get().states[hit];
    this.store.setUi({
      selectedStateId: hit,
      selectedCountryTag: def?.owner ?? null,
    });
  };

  private readonly handlePointerLeave = (): void => {
    if (this.store.getUi().hoveredStateId !== null) {
      this.store.setUi({ hoveredStateId: null });
    }
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const factor = Math.exp(-event.deltaY * 0.0015);
    this.zoomAt(event.clientX - rect.left, event.clientY - rect.top, factor);
  };

  private hitTest(screenX: number, screenY: number): string | null {
    const [wx, wy] = this.toWorld(screenX, screenY);
    const ctx = this.ctx;
    for (const shape of this.shapes.values()) {
      if (!bboxContains(shape.bbox, wx, wy)) continue;
      if (ctx.isPointInPath(shape.path, wx, wy)) return shape.id;
    }
    return null;
  }

  // ----------------------------------------------------------------- render

  invalidate(): void {
    this.dirty = true;
    if (this.frame !== null) return;
    this.frame = window.requestAnimationFrame(() => {
      this.frame = null;
      if (!this.dirty) return;
      this.dirty = false;
      this.render();
    });
  }

  private render(): void {
    const ctx = this.ctx;
    const { scale, tx, ty } = this.view;
    const game = this.store.get();
    const ui = this.store.getUi();
    const countries = game.countries;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = SEA_COLOR;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);

    // Graticule.
    ctx.lineWidth = 0.5 / scale;
    ctx.strokeStyle = GRATICULE_COLOR;
    ctx.stroke(this.graticule);

    // Fills.
    for (const shape of this.shapes.values()) {
      const def = game.states[shape.id];
      ctx.fillStyle = this.fillFor(def, ui.mapMode, countries);
      ctx.fill(shape.path);
    }

    // Decentralized hatch.
    if (ui.mapMode === 'political') {
      ctx.save();
      ctx.lineWidth = 0.5 / scale;
      ctx.strokeStyle = HATCH_COLOR;
      for (const shape of this.shapes.values()) {
        const def = game.states[shape.id];
        if (!def || def.owner !== null) continue;
        ctx.save();
        ctx.clip(shape.path);
        const b = shape.bbox;
        const step = 6 / scale;
        ctx.beginPath();
        for (let x = b.minX - (b.maxY - b.minY); x < b.maxX; x += step) {
          ctx.moveTo(x, b.minY);
          ctx.lineTo(x + (b.maxY - b.minY), b.maxY);
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    // Borders, constant on screen.
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = STATE_BORDER_COLOR;
    ctx.lineWidth = 0.6 / scale;
    ctx.stroke(this.stateBorders);
    ctx.strokeStyle = COAST_COLOR;
    ctx.lineWidth = 1.2 / scale;
    ctx.stroke(this.coastlines);
    ctx.strokeStyle = COUNTRY_BORDER_COLOR;
    ctx.lineWidth = 2 / scale;
    ctx.stroke(this.countryBorders);

    // Hover overlay.
    const hovered = ui.hoveredStateId;
    if (hovered !== null) {
      const shape = this.shapes.get(hovered);
      if (shape) {
        ctx.fillStyle = HOVER_COLOR;
        ctx.fill(shape.path);
      }
    }

    // Selection outline.
    const selected = ui.selectedStateId;
    if (selected !== null) {
      const shape = this.shapes.get(selected);
      if (shape) {
        ctx.strokeStyle = SELECT_COLOR;
        ctx.lineWidth = 2.5 / scale;
        ctx.stroke(shape.path);
      }
    }

    ctx.restore();

    this.drawLabels(scale, tx, ty);
  }

  private fillFor(
    def: StateDef | undefined,
    mode: MapMode,
    countries: Record<string, CountryDef>,
  ): string {
    if (!def) return DECENTRALIZED_COLOR;
    if (mode === 'states') return pastelFor(def.id);
    if (def.owner === null) return DECENTRALIZED_COLOR;
    return countries[def.owner]?.color ?? DECENTRALIZED_COLOR;
  }

  private drawLabels(scale: number, tx: number, ty: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    const placed: BBox[] = [];
    for (const label of this.labels) {
      const sx = label.x * scale + tx;
      const sy = label.y * scale + ty;
      if (sx < -200 || sy < -100 || sx > this.width + 200 || sy > this.height + 100) continue;

      // Size the name to the country's on-screen extent (wider of width/height
      // weighted toward width), capped so huge empires don't shout.
      const w = (label.bbox.maxX - label.bbox.minX) * scale;
      const h = (label.bbox.maxY - label.bbox.minY) * scale;
      const extent = Math.max(w, h * 0.6);
      ctx.font = `600 10px "Cormorant Garamond", Georgia, serif`;
      const widthAt10 = ctx.measureText(label.name).width;
      const fontSize = Math.min(28, (extent * 0.7 * 10) / widthAt10);
      if (fontSize < 9) continue;
      ctx.font = `600 ${fontSize.toFixed(1)}px "Cormorant Garamond", Georgia, serif`;
      const textWidth = (widthAt10 * fontSize) / 10;

      const rect: BBox = {
        minX: sx - textWidth / 2 - 2,
        maxX: sx + textWidth / 2 + 2,
        minY: sy - fontSize * 0.6,
        maxY: sy + fontSize * 0.6,
      };
      if (placed.some((r) => r.minX < rect.maxX && r.maxX > rect.minX && r.minY < rect.maxY && r.maxY > rect.minY)) {
        continue;
      }
      placed.push(rect);

      ctx.lineWidth = Math.max(2, fontSize * 0.28);
      ctx.strokeStyle = LABEL_HALO;
      ctx.strokeText(label.name, sx, sy);
      ctx.fillStyle = LABEL_COLOR;
      ctx.fillText(label.name, sx, sy);
    }

    ctx.restore();
  }

  dispose(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers.length = 0;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener('resize', this.handleWindowResize);
    if (this.frame !== null) window.cancelAnimationFrame(this.frame);
    this.frame = null;
    this.canvas.remove();
  }
}
