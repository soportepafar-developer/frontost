export const DESCARTE_RESINA_POR_DEFECTO = 8;
export const LIMPIEZA_CHOCOLATE_POR_DEFECTO = 0.5;
export const CANTIDAD_MAXIMA_CNC = 5;

export const MATERIALES_CORTE_LASER = [
  'Acrílico negro',
  'Cuero',
  'Cartón',
  'Cartulina',
  'Vinilo'
];

export interface ReglasPiezaTecnologia {
  codigo: string;
  etiquetaTipoMaterial: string;
  mostrarTipoMaterial: boolean;
  mostrarMarca: boolean;
  mostrarColor: boolean;
  mostrarMaterialInsumo: boolean;
  mostrarGramos: boolean;
  mostrarDimensiones: boolean;
  mostrarCarasPcb: boolean;
  mostrarMascarasUv: boolean;
  mostrarDescartables: boolean;
  mostrarLimpieza: boolean;
  mostrarEmpaque: boolean;
  mostrarMaterialLibre: boolean;
  exigirMaterialInsumo: boolean;
  exigirGramos: boolean;
  autoseleccionarInsumo: boolean;
  cantidadMaxima: number | null;
  descuentaInventario: boolean;
  usaSuperficie: boolean;
  materialesAprobados: string[];
  descartablesPorDefecto: number;
  limpiezaPorDefecto: number;
}

const BASE: ReglasPiezaTecnologia = {
  codigo: 'FDM',
  etiquetaTipoMaterial: 'Tipo de polímero',
  mostrarTipoMaterial: true,
  mostrarMarca: true,
  mostrarColor: true,
  mostrarMaterialInsumo: true,
  mostrarGramos: true,
  mostrarDimensiones: false,
  mostrarCarasPcb: false,
  mostrarMascarasUv: false,
  mostrarDescartables: false,
  mostrarLimpieza: false,
  mostrarEmpaque: false,
  mostrarMaterialLibre: false,
  exigirMaterialInsumo: true,
  exigirGramos: false,
  autoseleccionarInsumo: false,
  cantidadMaxima: null,
  descuentaInventario: true,
  usaSuperficie: false,
  materialesAprobados: [],
  descartablesPorDefecto: DESCARTE_RESINA_POR_DEFECTO,
  limpiezaPorDefecto: LIMPIEZA_CHOCOLATE_POR_DEFECTO
};

export function normalizarTecnologiaPieza(tecnologia?: string | null): string {
  return String(tecnologia || '').toUpperCase().trim();
}

export function reglasDePieza(tecnologia?: string | null): ReglasPiezaTecnologia {
  const codigo = normalizarTecnologiaPieza(tecnologia);
  if (codigo === 'SLA') {
    return {
      ...BASE,
      codigo,
      etiquetaTipoMaterial: 'Tipo de resina',
      mostrarDescartables: true,
      autoseleccionarInsumo: true
    };
  }
  if (codigo === 'CNC') {
    return {
      ...BASE,
      codigo,
      mostrarTipoMaterial: false,
      mostrarMarca: false,
      mostrarGramos: false,
      mostrarDimensiones: true,
      mostrarCarasPcb: true,
      mostrarMascarasUv: true,
      exigirMaterialInsumo: false,
      cantidadMaxima: CANTIDAD_MAXIMA_CNC,
      usaSuperficie: true
    };
  }
  if (codigo === 'LSR') {
    return {
      ...BASE,
      codigo,
      etiquetaTipoMaterial: 'Tipo de material',
      mostrarMarca: false,
      mostrarGramos: false,
      mostrarDimensiones: true,
      exigirMaterialInsumo: false,
      usaSuperficie: true,
      materialesAprobados: MATERIALES_CORTE_LASER
    };
  }
  if (codigo === 'CHO') {
    return {
      ...BASE,
      codigo,
      etiquetaTipoMaterial: 'Tipo de material',
      mostrarColor: false,
      mostrarLimpieza: true,
      mostrarEmpaque: true,
      autoseleccionarInsumo: true
    };
  }
  if (codigo === 'ALM') {
    return {
      ...BASE,
      codigo,
      mostrarTipoMaterial: false,
      mostrarMarca: false,
      mostrarColor: false,
      mostrarMaterialInsumo: false,
      mostrarGramos: false,
      mostrarMaterialLibre: true,
      exigirMaterialInsumo: false,
      descuentaInventario: false
    };
  }
  return { ...BASE, codigo: codigo || 'FDM' };
}

export function calcularAreaCm2(ancho?: number | string | null, largo?: number | string | null): number {
  const a = Number(ancho) || 0;
  const l = Number(largo) || 0;
  if (a <= 0 || l <= 0) {
    return 0;
  }
  return Math.round(a * l * 100) / 100;
}

export function materialAprobadoParaCorte(nombre?: string | null): boolean {
  const texto = String(nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!texto) {
    return false;
  }
  if (texto.includes('acrilico')) {
    return texto.includes('negro');
  }
  return ['cuero', 'carton', 'cartulina', 'vinilo'].some(clave => texto.includes(clave));
}

export interface CamposTecnologiaPieza {
  anchoCm?: number;
  largoCm?: number;
  areaCm2?: number;
  carasPcb?: number;
  mascaraUvSoldadura?: boolean;
  mascaraUvTextos?: boolean;
  descartablesPct?: number;
  limpiezaMaquina?: number;
  empaque?: number;
  materialLibre?: string;
  costoEstimado?: number;
  polimero?: string;
  marca?: string;
  color?: string;
}

export function extraerCamposTecnologia(origen: Record<string, unknown> | null | undefined): CamposTecnologiaPieza {
  const o = origen || {};
  const num = (...claves: string[]): number | undefined => {
    for (const clave of claves) {
      const valor = Number(o[clave]);
      if (!isNaN(valor) && o[clave] !== '' && o[clave] !== null && o[clave] !== undefined) {
        return valor;
      }
    }
    return undefined;
  };
  const bool = (...claves: string[]): boolean | undefined => {
    for (const clave of claves) {
      if (o[clave] === true || o[clave] === 1 || o[clave] === '1' || o[clave] === 'true') {
        return true;
      }
      if (o[clave] === false || o[clave] === 0 || o[clave] === '0' || o[clave] === 'false') {
        return false;
      }
    }
    return undefined;
  };
  const texto = (...claves: string[]): string | undefined => {
    for (const clave of claves) {
      const valor = String(o[clave] ?? '').trim();
      if (valor) {
        return valor;
      }
    }
    return undefined;
  };
  const anchoCm = num('anchoCm', 'ancho_cm', 'piezaAnchoCm');
  const largoCm = num('largoCm', 'largo_cm', 'piezaLargoCm');
  return {
    anchoCm,
    largoCm,
    areaCm2: num('areaCm2', 'area_cm2') ?? calcularAreaCm2(anchoCm, largoCm),
    carasPcb: num('carasPcb', 'caras_pcb', 'piezaCarasPcb'),
    mascaraUvSoldadura: bool('mascaraUvSoldadura', 'mascara_uv_soldadura', 'piezaMascaraUvSoldadura'),
    mascaraUvTextos: bool('mascaraUvTextos', 'mascara_uv_textos', 'piezaMascaraUvTextos'),
    descartablesPct: num('descartablesPct', 'descartables_pct', 'piezaDescartablesPct'),
    limpiezaMaquina: num('limpiezaMaquina', 'limpieza_maquina', 'piezaLimpiezaMaquina'),
    empaque: num('empaque', 'piezaEmpaque'),
    materialLibre: texto('materialLibre', 'material_libre', 'piezaMaterialLibre'),
    costoEstimado: num('costoEstimado', 'costo_estimado', 'piezaCostoEstimado'),
    polimero: texto('polimero', 'piezaPolimero'),
    marca: texto('marca', 'piezaMarca'),
    color: texto('color', 'piezaColor')
  };
}

export function serializarCamposTecnologia(campos: CamposTecnologiaPieza): Record<string, unknown> {
  return {
    anchoCm: campos.anchoCm ?? 0,
    ancho_cm: campos.anchoCm ?? 0,
    largoCm: campos.largoCm ?? 0,
    largo_cm: campos.largoCm ?? 0,
    areaCm2: campos.areaCm2 ?? calcularAreaCm2(campos.anchoCm, campos.largoCm),
    area_cm2: campos.areaCm2 ?? calcularAreaCm2(campos.anchoCm, campos.largoCm),
    carasPcb: campos.carasPcb ?? 0,
    caras_pcb: campos.carasPcb ?? 0,
    mascaraUvSoldadura: !!campos.mascaraUvSoldadura,
    mascara_uv_soldadura: !!campos.mascaraUvSoldadura,
    mascaraUvTextos: !!campos.mascaraUvTextos,
    mascara_uv_textos: !!campos.mascaraUvTextos,
    descartablesPct: campos.descartablesPct ?? 0,
    descartables_pct: campos.descartablesPct ?? 0,
    limpiezaMaquina: campos.limpiezaMaquina ?? 0,
    limpieza_maquina: campos.limpiezaMaquina ?? 0,
    empaque: campos.empaque ?? 0,
    materialLibre: campos.materialLibre || '',
    material_libre: campos.materialLibre || '',
    costoEstimado: campos.costoEstimado ?? 0,
    costo_estimado: campos.costoEstimado ?? 0
  };
}

export function textoMedidaPieza(pieza: {
  tecnologia?: string;
  gramos?: number;
  cantidad?: number;
  anchoCm?: number;
  largoCm?: number;
  areaCm2?: number;
  materialLibre?: string;
}): string {
  const reglas = reglasDePieza(pieza.tecnologia);
  const cantidad = Number(pieza.cantidad) || 1;
  if (reglas.usaSuperficie) {
    const area = Number(pieza.areaCm2) || calcularAreaCm2(pieza.anchoCm, pieza.largoCm);
    if (area <= 0) {
      return '-';
    }
    const total = Math.round(area * cantidad * 100) / 100;
    return `${total} cm²`;
  }
  if (reglas.mostrarMaterialLibre) {
    return '-';
  }
  const gramos = Number(pieza.gramos) || 0;
  if (gramos <= 0) {
    return '-';
  }
  return `${Math.round(gramos * cantidad * 100) / 100} g`;
}

export interface BloquePiezas<T> {
  clave: string;
  tecnologia: string;
  equipo: string;
  esInventario: boolean;
  piezas: Array<{ pieza: T; indice: number }>;
  horas: number;
  minutos: number;
  totalMinutos: number;
}

export function claveBloquePieza(pieza: {
  tipo?: string;
  tecnologia?: string;
  maquina?: number;
  maquinaNombre?: string;
}): { clave: string; tecnologia: string; equipo: string; esInventario: boolean } {
  const esInventario = String(pieza.tipo || '').toLowerCase() === 'del inventario';
  const tecnologia = esInventario ? 'Inventario' : (normalizarTecnologiaPieza(pieza.tecnologia) || 'Sin tecnología');
  const equipo = esInventario
    ? 'Piezas de inventario'
    : (pieza.maquinaNombre || (pieza.maquina ? `Equipo ${pieza.maquina}` : 'Sin equipo'));
  return {
    clave: `${tecnologia}|${equipo}`,
    tecnologia,
    equipo,
    esInventario
  };
}

export function agruparPiezasPorEquipo<T extends {
  tipo?: string;
  tecnologia?: string;
  maquina?: number;
  maquinaNombre?: string;
  horas?: number;
  minutos?: number;
  cantidad?: number;
}>(piezas: T[]): BloquePiezas<T>[] {
  const mapa = new Map<string, BloquePiezas<T>>();
  (piezas || []).forEach((pieza, indice) => {
    const info = claveBloquePieza(pieza);
    if (!mapa.has(info.clave)) {
      mapa.set(info.clave, {
        clave: info.clave,
        tecnologia: info.tecnologia,
        equipo: info.equipo,
        esInventario: info.esInventario,
        piezas: [],
        horas: 0,
        minutos: 0,
        totalMinutos: 0
      });
    }
    const bloque = mapa.get(info.clave) as BloquePiezas<T>;
    bloque.piezas.push({ pieza, indice });
    if (!info.esInventario) {
      bloque.totalMinutos += (Number(pieza.horas) || 0) * 60 + (Number(pieza.minutos) || 0);
    }
  });
  return [...mapa.values()].map(bloque => ({
    ...bloque,
    horas: Math.floor(bloque.totalMinutos / 60),
    minutos: bloque.totalMinutos % 60
  }));
}

export function asignarHorasDeBloque<T extends {
  tipo?: string;
  tecnologia?: string;
  maquina?: number;
  maquinaNombre?: string;
  horas?: number;
  minutos?: number;
}>(piezas: T[], claveBloque: string, horas: number | string, minutos: number | string): void {
  const h = Math.max(0, Math.floor(Number(horas) || 0));
  const m = Math.max(0, Math.floor(Number(minutos) || 0));
  const totalMin = h * 60 + m;
  const finalH = Math.floor(totalMin / 60);
  const finalM = totalMin % 60;
  let asignado = false;

  (piezas || []).forEach(pieza => {
    const info = claveBloquePieza(pieza);
    if (info.esInventario || info.clave !== claveBloque) {
      return;
    }
    if (!asignado) {
      pieza.horas = finalH;
      pieza.minutos = finalM;
      asignado = true;
    } else {
      pieza.horas = 0;
      pieza.minutos = 0;
    }
  });
}

export function obtenerTecnologiasDisponibles<T extends { codigo?: string }>(
  tecnologias: T[],
  usadas: string[],
  multitecnologia: boolean
): T[] {
  const lista = [...(tecnologias || [])];
  if (multitecnologia || !usadas || usadas.length === 0) {
    return lista;
  }
  const unica = String(usadas[0] || '').toUpperCase().trim();
  return lista.filter(t => String(t.codigo || '').toUpperCase().trim() === unica);
}

export function valoresResetCamposTecnologia(tecnologia?: string | null): Record<string, unknown> {
  const reglas = reglasDePieza(tecnologia);
  return {
    piezaDescartablesPct: reglas.mostrarDescartables ? reglas.descartablesPorDefecto : '',
    piezaLimpiezaMaquina: reglas.mostrarLimpieza ? reglas.limpiezaPorDefecto : '',
    piezaEmpaque: '',
    piezaCarasPcb: reglas.mostrarCarasPcb ? 1 : '',
    piezaMascaraUvSoldadura: false,
    piezaMascaraUvTextos: false,
    piezaMaterialLibre: '',
    piezaCostoEstimado: ''
  };
}

export function preservarHorasAlEliminarPieza<T extends {
  tipo?: string;
  tecnologia?: string;
  maquina?: number;
  maquinaNombre?: string;
  horas?: number;
  minutos?: number;
}>(piezasAntes: T[], indiceAEliminar: number, piezasDespues: T[]): void {
  const bloqueAntes = agruparPiezasPorEquipo(piezasAntes).find(b => b.piezas.some(f => f.indice === indiceAEliminar));
  if (bloqueAntes && !bloqueAntes.esInventario && (bloqueAntes.horas > 0 || bloqueAntes.minutos > 0)) {
    asignarHorasDeBloque(piezasDespues, bloqueAntes.clave, bloqueAntes.horas, bloqueAntes.minutos);
  }
}

export function mensajeValidacionPieza(
  tecnologia: string,
  valores: {
    cantidad?: number;
    materialId?: number | string | null;
    gramos?: number;
    anchoCm?: number;
    largoCm?: number;
    carasPcb?: number;
    materialLibre?: string;
    costoEstimado?: number;
    polimero?: string;
  }
): string | null {
  const reglas = reglasDePieza(tecnologia);
  const cantidad = Number(valores.cantidad) || 0;
  if (!cantidad || cantidad <= 0) {
    return 'Ingrese una cantidad válida.';
  }
  if (reglas.cantidadMaxima && cantidad > reglas.cantidadMaxima) {
    return `Para circuitos impresos la cantidad va de 1 a ${reglas.cantidadMaxima} unidades.`;
  }
  if (reglas.exigirMaterialInsumo && !valores.materialId) {
    return 'Seleccione un material para la pieza fabricada.';
  }
  if (reglas.mostrarMaterialLibre && !String(valores.materialLibre || '').trim()) {
    return 'Indique el material que se va a usar. Este no se descuenta del inventario.';
  }
  if (reglas.mostrarMaterialLibre && !(Number(valores.costoEstimado) > 0)) {
    return 'Indique el costo estimado del material.';
  }
  if (reglas.usaSuperficie) {
    if (!(Number(valores.anchoCm) > 0) || !(Number(valores.largoCm) > 0)) {
      return 'Indique ancho y largo en centímetros.';
    }
  }
  if (reglas.mostrarCarasPcb) {
    const caras = Number(valores.carasPcb);
    if (caras !== 1 && caras !== 2) {
      return 'Seleccione si la placa tiene 1 cara o 2 caras.';
    }
  }
  if (reglas.materialesAprobados.length > 0) {
    const elegido = String(valores.polimero || valores.materialLibre || '');
    if (elegido && !materialAprobadoParaCorte(elegido)) {
      return 'Para corte láser solo se permiten acrílico negro, cuero, cartón, cartulina y vinilo.';
    }
  }
  if (reglas.exigirGramos && !(Number(valores.gramos) >= 0)) {
    return 'Ingrese los gramos de la pieza.';
  }
  return null;
}
