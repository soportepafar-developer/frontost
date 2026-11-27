import { Budget, Parts } from '../models/Cost/budge';
import { Asset } from '../models/Cost/asset';
import { Product } from '../models/Cost/product';
import { calculateBudgetTotals, costoHoraMaquina, normalizeBudget } from './budget-calculator';
import { calculateMultiItemTotals, hidratarLineas, nombresDeLineas, normalizarClasificacion } from './budget-items';
import { parsearTasasFallo, tasaFalloDePieza } from './family-rules';
import { agruparPiezasPorEquipo, calcularAreaCm2, reglasDePieza, textoMedidaPieza } from './piece-tech-rules';
import Swal from 'sweetalert2';

function escapeHtml(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface ClientModalData {
  nombre: string;
  rifCedula: string;
  nacionalidad: string;
  nroDocumento: string;
  categoria: string;
  telefono: string;
  email: string;
  direccion: string;
}

/*Parsea un documento o cédula/RIF en nacionalidad y número.*/
export function parseCedula(rawCedula: string): { nac: string; num: string } {
  const clean = String(rawCedula || '').trim();
  if (!clean) return { nac: 'V', num: '' };
  const match = clean.match(/^([VEJGP])[-_ ]*(.*)$/i);
  if (match) {
    return { nac: match[1].toUpperCase(), num: match[2] };
  }
  return { nac: 'V', num: clean };
}

/* Obtiene la descripción o nombre del producto asociado a un presupuesto.*/
export function resolveProductDescription(row: Budget, allProducts: Product[]): string {
  const rawR = row as unknown as Record<string, unknown>;
  const varios = nombresDeLineas(rawR, allProducts);
  if (varios) return varios;
  const prodId = Number(row.producto ?? rawR['producto_id'] ?? rawR['productoId']);
  if (prodId && allProducts.length > 0) {
    const found = allProducts.find(p => p.id == prodId);
    if (found?.nombre) {
      return found.nombre;
    }
  }
  const prodObj = rawR['producto'] as Record<string, unknown> | undefined;
  if (prodObj && typeof prodObj === 'object' && prodObj['nombre']) {
    return String(prodObj['nombre']);
  }
  return row.descripcion || 'Sin descripción';
}

/*Obtiene la tasa de costo de máquina aplicable al presupuesto.*/
export function resolveRateMaquina(row: Budget, allAssets: Asset[]): number {
  const rowRec = row as unknown as Record<string, unknown>;
  const rate = Number(row.costoMaquina ?? rowRec['costo_maquina'] ?? rowRec['costoMaquinaHora'] ?? rowRec['tasaMaquina']) || 0;
  if (rate > 0) return rate;

  if (row.piezas) {
    for (const p of row.piezas) {
      const pRec = p as unknown as Record<string, unknown>;
      const maqId = p.maquina ?? pRec['maquina_id'] ?? pRec['activo_id'];
      if (maqId) {
        const maq = allAssets.find(a => a.id == maqId);
        if (maq) {
          const consumo = Number(maq.consumoMaquina) || 0;
          const tarifa = Number(maq.tarifa) || 0;
          const mantenimiento = Number(maq.costoMantenimiento) || 0;
          const calc = (consumo / 1000 * tarifa) + mantenimiento;
          if (calc > 0) return calc;
        }
      }
    }
  }

  const firstMaq = allAssets.find(a => (a as unknown as Record<string, unknown>)['clasificacion'] === 'Maquinaria' || (a as unknown as Record<string, unknown>)['tipo'] === 'Maquinaria');
  if (firstMaq) {
    const consumo = Number(firstMaq.consumoMaquina) || 0;
    const tarifa = Number(firstMaq.tarifa) || 0;
    const mantenimiento = Number(firstMaq.costoMantenimiento) || 0;
    const calc = (consumo / 1000 * tarifa) + mantenimiento;
    if (calc > 0) return calc;
  }

  return 15.75;
}

/* Renderiza el modal interactivo de estudio de presupuesto con desglose por piezas y costos.*/
export function showBudgetStudyModal(
  row: Budget,
  allAssets: Asset[],
  totalFijoIndirecto: number,
  capacidadHorasMaquina: number
): void {
  const norm = normalizeBudget(row);
  const rowRec = row as unknown as Record<string, unknown>;
  const lineas = hidratarLineas(rowRec, norm.piezas || [], {
    maquinas: allAssets,
    materiales: allAssets,
    circulantes: allAssets,
    mobiliario: allAssets
  });

  const res = lineas.length > 0
    ? calculateMultiItemTotals(
        lineas,
        Number(norm.delivery) || 0,
        allAssets,
        totalFijoIndirecto,
        capacidadHorasMaquina
      )
    : calculateBudgetTotals(
        norm,
        allAssets,
        totalFijoIndirecto,
        capacidadHorasMaquina
      );

  const totalGramos = res.totalGramos;
  const finalHoras = res.totalHoras;
  const finalMinutos = res.totalMinutos;
  const totalCostoMaterial = res.totalCostoMaterial;
  const totalCostoMaquina = res.totalCostoMaquina;
  const totalCostoIndirecto = res.costoIndirectoAsignado;
  const depreciacionAsignada = res.depreciacionAsignada;
  const totalCostoInventario = res.totalCostoInventario;
  const baseCost = res.costoTotalUnitarioBase;
  const suggestedPrice = res.precioSugeridoUnitario;
  const deliveryCost = res.delivery;
  const totalBudgetFinal = res.costoTotalFinal;

  const tasasMapa = parsearTasasFallo(norm.tasasFallo);

  function costoInsumoPieza(p: Parts): number {
    const pRec = p as unknown as Record<string, unknown>;
    const cant = Number(pRec['cantidad'] ?? p.cantidad) || 1;
    const tipo = String(pRec['tipo'] ?? p.tipo ?? 'Fabricada');
    if (tipo === 'Del Inventario') {
      const actId = pRec['activo'] ?? pRec['activo_id'] ?? pRec['assetId'] ?? p.activo;
      let unitVal = 0;
      if (actId && allAssets && allAssets.length > 0) {
        const found = allAssets.find(a => a.id == actId);
        if (found) {
          unitVal = Number(found.costoInicial || found.valorUnitario) || Number((found as unknown as Record<string, unknown>)['precio']) || 0;
        }
      }
      if (unitVal <= 0) {
        unitVal = Number(pRec['costoInicial'] ?? pRec['valorUnitario'] ?? pRec['precio'] ?? pRec['precioMaterial'] ?? p.precioMaterial) || 0;
      }
      return unitVal * cant;
    }

    const reglas = reglasDePieza(p.tecnologia);
    let precioMat = Number(pRec['precioMaterial'] ?? pRec['precio_material'] ?? p.precioMaterial) || 0;
    if (precioMat <= 0 && p.activo && allAssets && allAssets.length > 0) {
      const foundAsset = allAssets.find(a => a.id == p.activo);
      if (foundAsset) {
        precioMat = Number(foundAsset.valorUnitario) || Number(foundAsset.costoInicial) || 0;
      }
    }

    let total = 0;
    if (reglas.codigo === 'ALM') {
      total = (Number(pRec['costoEstimado'] ?? p.costoEstimado) || precioMat) * cant;
    } else if (reglas.usaSuperficie) {
      const area = Number(pRec['areaCm2'] ?? pRec['area_cm2'] ?? p.areaCm2)
        || calcularAreaCm2(Number(pRec['anchoCm'] ?? p.anchoCm), Number(pRec['largoCm'] ?? p.largoCm));
      const caras = Number(pRec['carasPcb'] ?? p.carasPcb) > 0 ? Number(pRec['carasPcb'] ?? p.carasPcb) : 1;
      total = area * caras * precioMat * cant;
    } else {
      const g = Number(pRec['gramos'] ?? p.gramos) || 0;
      let precioGramo = precioMat;
      if (precioGramo >= 1.0) {
        precioGramo = precioGramo / 1000;
      }
      const descartables = reglas.mostrarDescartables
        ? (Number(pRec['descartablesPct'] ?? p.descartablesPct) || 0) / 100
        : 0;
      total = (g * (1 + descartables) * precioGramo) * cant;
    }

    if (reglas.mostrarLimpieza) {
      total += (Number(pRec['limpiezaMaquina'] ?? p.limpiezaMaquina) || 0) * cant;
    }
    if (reglas.mostrarEmpaque) {
      total += (Number(pRec['empaque'] ?? p.empaque) || 0) * cant;
    }
    return total;
  }

  function renderPiezaRow(p: Parts): string {
    const pRec = p as unknown as Record<string, unknown>;
    const cant = Number(pRec['cantidad'] ?? p.cantidad) || 1;
    const tipo = String(pRec['tipo'] ?? p.tipo ?? 'Fabricada');
    const medida = textoMedidaPieza(p);
    const matCost = costoInsumoPieza(p);
    const cleanNombre = escapeHtml(p.nombre || 'Pieza');

    return `
      <tr>
        <td class="text-start ps-3 fw-medium text-dark" style="max-width: 280px;">
          <div class="text-truncate" title="${cleanNombre}">${cleanNombre}</div>
          ${cant > 1 ? `<span class="badge bg-secondary bg-opacity-10 text-secondary" style="font-size: 0.65rem;">x${cant} uds</span>` : ''}
        </td>
        <td><span class="badge ${tipo === 'Del Inventario' ? 'bg-info bg-opacity-10 text-info' : 'bg-primary bg-opacity-10 text-primary'}" style="font-size: 0.68rem;">${escapeHtml(tipo)}</span></td>
        <td>${escapeHtml(medida)}</td>
        <td class="fw-semibold text-dark pe-3">$${matCost.toFixed(2)}</td>
      </tr>
    `;
  }

  function renderBloquesPiezas(itemPiezas: Parts[], tasaFallback: number): string {
    if (!itemPiezas.length) {
      return `
        <div class="text-muted text-center py-2 fst-italic bg-light bg-opacity-25" style="font-size: 0.72rem;">
          <i class="ti ti-info-circle me-1"></i>Ítem directo sin piezas desglosadas
        </div>
      `;
    }
    const bloques = agruparPiezasPorEquipo(itemPiezas);
    return bloques.map(bloque => {
      let maqRate = res.costoMaquinaRate;
      if (!bloque.esInventario && allAssets && allAssets.length > 0) {
        const pieceWithMaq = bloque.piezas.find(({ pieza }) => {
          const pRec = pieza as unknown as Record<string, unknown>;
          return pieza.maquina ?? pRec['maquina_id'] ?? pRec['activo_id'];
        });
        if (pieceWithMaq) {
          const pRec = pieceWithMaq.pieza as unknown as Record<string, unknown>;
          const maqId = pieceWithMaq.pieza.maquina ?? pRec['maquina_id'] ?? pRec['activo_id'];
          const maq = allAssets.find(a => a.id == maqId);
          if (maq) {
            maqRate = costoHoraMaquina(maq).rate;
          }
        }
      }
      const bloqueMaqCost = bloque.esInventario ? 0 : (maqRate || 0) * (bloque.totalMinutos / 60);
      const fallaBloque = bloque.esInventario
        ? 0
        : tasaFalloDePieza({ tecnologia: bloque.tecnologia }, tasasMapa, tasaFallback);
      const filasPiezas = bloque.piezas.map(({ pieza }) => renderPiezaRow(pieza)).join('');

      return `
        <div class="border-bottom border-light">
          <div class="bg-light bg-opacity-50 px-3 py-1 d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom border-light" style="font-size: 0.72rem;">
            <div class="d-flex align-items-center gap-2">
              <span class="badge ${bloque.esInventario ? 'bg-success' : 'bg-primary'} bg-opacity-10 ${bloque.esInventario ? 'text-success' : 'text-primary'}">${escapeHtml(bloque.tecnologia)}</span>
              <span class="fw-semibold text-dark">${escapeHtml(bloque.equipo)}</span>
            </div>
            ${!bloque.esInventario ? `
              <div class="d-flex align-items-center gap-2 text-muted">
                ${fallaBloque > 0 ? `<span class="badge bg-danger bg-opacity-10 text-danger">Falla: ${fallaBloque}%</span>` : ''}
                <span class="badge bg-primary bg-opacity-10 text-primary">${bloque.horas}h ${bloque.minutos}m</span>
                <span class="fw-semibold text-primary">Máq.: $${bloqueMaqCost.toFixed(2)}</span>
              </div>
            ` : ''}
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-hover align-middle mb-0 text-center" style="font-size: 0.75rem;">
              <thead class="table-light text-muted" style="font-size: 0.68rem; background-color: #fafbfc;">
                <tr>
                  <th class="text-start ps-3 py-1 fw-semibold" style="width: 48%;">Pieza / Insumo</th>
                  <th class="py-1 fw-semibold">Tipo</th>
                  <th class="py-1 fw-semibold">Medida</th>
                  <th class="py-1 fw-semibold pe-3">Costo Insumo</th>
                </tr>
              </thead>
              <tbody>
                ${filasPiezas}
              </tbody>
              ${!bloque.esInventario ? `
                <tfoot>
                  <tr class="table-light fw-semibold" style="font-size: 0.72rem;">
                    <td colspan="2" class="text-end text-muted ps-3">Bloque ${escapeHtml(bloque.tecnologia)}:</td>
                    <td class="text-primary">${bloque.horas}h ${bloque.minutos}m</td>
                    <td class="text-primary pe-3">$${bloqueMaqCost.toFixed(2)}</td>
                  </tr>
                </tfoot>
              ` : ''}
            </table>
          </div>
        </div>
      `;
    }).join('');
  }

  const itemsParaMostrar = lineas.length > 0 ? lineas : [{
    clave: 'item-default',
    productoId: null,
    clasificacion: norm.clasificacion || 'Producto',
    nombre: norm.descripcion || 'Producto Principal',
    cantidad: norm.cantidadGlobal || 1,
    tiempoSetup: res.tiempoSetupMin || 0,
    tiempoPostProcesado: res.tiempoPostProcesadoMin || 0,
    tasaFallo: norm.tasaFalloGlobal || 0,
    margenGanancia: norm.margenGanancia || 0,
    piezas: norm.piezas || []
  }];

  const productosHtml = itemsParaMostrar.map((item, idx) => {
    const itemPiezas = (item.piezas && item.piezas.length > 0) ? item.piezas : (itemsParaMostrar.length === 1 ? (norm.piezas || []) : []);
    const itemClasif = normalizarClasificacion(item.clasificacion);
    const isExpanded = itemsParaMostrar.length === 1 ? true : (idx === 0);
    const bloquesHtml = renderBloquesPiezas(itemPiezas, Number(item.tasaFallo ?? norm.tasaFalloGlobal) || 0);

    return `
      <div class="card border border-light-subtle rounded-3 shadow-none mb-2 bg-white overflow-hidden">
        <div class="card-header bg-light bg-opacity-60 py-2 px-3 d-flex flex-wrap justify-content-between align-items-center cursor-pointer item-toggle-header" data-target="drawer-item-${idx}" style="cursor: pointer; user-select: none;">
          <div class="d-flex align-items-center gap-2">
            <span class="badge ${itemClasif === 'Servicio' ? 'bg-success' : 'bg-primary'} bg-opacity-10 ${itemClasif === 'Servicio' ? 'text-success' : 'text-primary'} fw-semibold px-2 py-1" style="font-size: 0.7rem;">
              <i class="ti ${itemClasif === 'Servicio' ? 'ti-tools' : 'ti-box'} me-1"></i>${escapeHtml(itemClasif)}
            </span>
            <span class="fw-bold text-dark" style="font-size: 0.88rem;">${escapeHtml(item.nombre || `Ítem ${idx + 1}`)}</span>
            <span class="badge bg-light text-muted border px-2 py-0" style="font-size: 0.7rem;">
              ${item.cantidad > 1 ? `${item.cantidad} unidades` : '1 unidad'}
            </span>
          </div>
          <div class="d-flex align-items-center gap-3">
            <div class="d-none d-sm-flex align-items-center gap-3 text-muted" style="font-size: 0.72rem;">
              ${item.margenGanancia ? `<span>Margen: <b class="text-dark">${item.margenGanancia}%</b></span>` : ''}
              ${item.tasaFallo ? `<span>Merma: <b class="text-danger">${item.tasaFallo}%</b></span>` : ''}
              ${(item.tiempoSetup || item.tiempoPostProcesado) ? `<span>Setup/Post: <b class="text-dark">${item.tiempoSetup || 0}m / ${item.tiempoPostProcesado || 0}m</b></span>` : ''}
            </div>
            <button type="button" class="btn btn-sm btn-white border py-0 px-2 text-primary d-flex align-items-center gap-1 shadow-none" style="font-size: 0.72rem; pointer-events: none;">
              <span>${itemPiezas.length} ${itemPiezas.length === 1 ? 'pieza' : 'piezas'}</span>
              <i class="ti ${isExpanded ? 'ti-chevron-up' : 'ti-chevron-down'} chevron-icon-${idx}"></i>
            </button>
          </div>
        </div>
        <div id="drawer-item-${idx}" class="item-drawer ${isExpanded ? '' : 'd-none'} border-top border-light">
          ${bloquesHtml}
        </div>
      </div>
    `;
  }).join('');

  Swal.fire({
    title: `<div class="text-start text-primary fw-bold fs-5">Estudio de Presupuesto</div>`,
    html: `
      <div class="text-start" style="font-family: 'Inter', sans-serif; font-size: 0.85rem; max-height: 75vh; overflow-y: auto; padding-right: 4px;">
        <div class="row g-3 mb-3">
          <div class="col-md-7">
            <div class="card border-0 shadow-sm h-100 bg-light">
              <div class="card-header bg-transparent border-bottom-0 pt-3 pb-1 text-start">
                <h6 class="fw-bold text-dark mb-0 fs-6"><i class="ti ti-file-description me-2"></i>Datos del Presupuesto</h6>
              </div>
              <div class="card-body px-3 py-2 text-start">
                <div class="d-flex justify-content-between border-bottom border-secondary border-opacity-10 py-1">
                  <span class="text-muted" style="font-size: 0.8rem;">Clasificación:</span>
                  <span class="fw-medium text-dark">${normalizarClasificacion(norm.clasificacion)}</span>
                </div>
                <div class="d-flex justify-content-between border-bottom border-secondary border-opacity-10 py-1">
                  <span class="text-muted" style="font-size: 0.8rem;">Nro. de Orden:</span>
                  <span class="fw-medium text-dark">${norm.numero || ''}</span>
                </div>
                <div class="d-flex justify-content-between border-bottom border-secondary border-opacity-10 py-1">
                  <span class="text-muted" style="font-size: 0.8rem;">Fecha:</span>
                  <span class="fw-medium text-dark">${norm.fecha ? new Date(norm.fecha).toLocaleDateString() : ''}</span>
                </div>
                <div class="d-flex justify-content-between border-bottom border-secondary border-opacity-10 py-1">
                  <span class="text-muted" style="font-size: 0.8rem;">Descripción:</span>
                  <span class="fw-medium text-dark">${norm.descripcion || ''}</span>
                </div>
                <div class="d-flex justify-content-between border-bottom border-secondary border-opacity-10 py-1">
                  <span class="text-muted" style="font-size: 0.8rem;">Tasa de Fallo (Merma):</span>
                  <span class="text-danger fw-medium">${norm.tasaFalloGlobal || 0}%</span>
                </div>
                <div class="d-flex justify-content-between border-bottom border-secondary border-opacity-10 py-1">
                  <span class="text-muted" style="font-size: 0.8rem;">Prep/Slicing:</span>
                  <span class="fw-medium text-dark">${res.tiempoSetupMin} min</span>
                </div>
                <div class="d-flex justify-content-between pt-1">
                  <span class="text-muted" style="font-size: 0.8rem;">Post-procesado:</span>
                  <span class="fw-medium text-dark">${res.tiempoPostProcesadoMin} min</span>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-5">
            <div class="card h-100 border-0 text-white shadow-sm" style="background-color: #2b5fe8; border-radius: 8px;">
              <div class="card-body text-start p-3 d-flex flex-column">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <span class="text-uppercase text-white-50 fw-bold" style="font-size: 0.7rem; letter-spacing: 1px;">Análisis de Costos</span>
                  <div class="bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center" style="width: 24px; height: 24px;">
                    <i class="ti ti-currency-dollar fs-6 text-white"></i>
                  </div>
                </div>
                <div class="d-flex justify-content-between mb-1" style="font-size: 0.8rem;">
                  <span class="text-white-50">Costo de Materiales (con merma):</span>
                  <span class="fw-medium">$${totalCostoMaterial.toFixed(2)}</span>
                </div>
                <div class="d-flex justify-content-between mb-1" style="font-size: 0.8rem;">
                  <span class="text-white-50">Costo Operativo Máquina:</span>
                  <span class="fw-medium">$${totalCostoMaquina.toFixed(2)}</span>
                </div>
                <div class="d-flex justify-content-between mb-1" style="font-size: 0.8rem;">
                  <span class="text-white-50">Costo Indirecto Prorrateado:</span>
                  <span class="fw-medium">$${totalCostoIndirecto.toFixed(2)}</span>
                </div>
                ${depreciacionAsignada > 0 ? `
                <div class="d-flex justify-content-between mb-1" style="font-size: 0.8rem;">
                  <span class="text-white-50">Depreciación Prorrateada:</span>
                  <span class="fw-medium">$${depreciacionAsignada.toFixed(2)}</span>
                </div>
                ` : ''}
                ${totalCostoInventario > 0 ? `
                <div class="d-flex justify-content-between mb-1" style="font-size: 0.8rem;">
                  <span class="text-white-50">Costo Piezas Inventario:</span>
                  <span class="fw-medium">$${totalCostoInventario.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="d-flex justify-content-between mb-2 border-bottom border-white border-opacity-25 pb-2" style="font-size: 0.8rem;">
                  <span class="text-white-50">${lineas.length > 1 ? 'Costo Base Total (Ítems):' : 'Costo Unitario Base:'}</span>
                  <span class="fw-bold">$${baseCost.toFixed(2)}</span>
                </div>
                <div class="mt-2 pt-2 border-top border-white border-opacity-25">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="text-white-50" style="font-size: 0.75rem;">${lineas.length > 1 ? 'Subtotal Sugerido (Ítems):' : 'Precio Sugerido Unitario:'}</span>
                    <span class="fw-bold text-white fs-5">$${suggestedPrice.toFixed(2)}</span>
                  </div>
                  ${deliveryCost > 0 ? `
                  <div class="d-flex justify-content-between align-items-center mb-1" style="font-size: 0.75rem;">
                    <span class="text-white-50">Costo de Delivery:</span>
                    <span class="fw-medium text-white">$${deliveryCost.toFixed(2)}</span>
                  </div>
                  ` : ''}
                  <div class="pt-2 border-top border-white border-opacity-25 mt-2">
                    <div class="text-white-50 mb-1" style="font-size: 0.7rem;">Presupuesto Total Final</div>
                    <div class="fs-4 fw-bold text-warning">$${totalBudgetFinal.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="mb-3">
          <h6 class="fw-bold mb-2 text-dark fs-6"><i class="ti ti-layers-intersect me-2 text-muted"></i>Especificaciones Físicas Totales</h6>
          <div class="row g-2">
            <div class="col-md-4">
              <div class="card border border-light shadow-sm bg-white">
                <div class="card-body p-2 d-flex align-items-center">
                  <div class="bg-primary bg-opacity-10 rounded-circle p-1 text-primary me-2">
                    <i class="ti ti-weight fs-5"></i>
                  </div>
                  <div>
                    <div class="text-muted mb-0" style="font-size: 0.7rem;">Gramos Totales</div>
                    <div class="fw-bold fs-6 text-dark">${totalGramos.toFixed(2)}g</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border border-light shadow-sm bg-white">
                <div class="card-body p-2 d-flex align-items-center">
                  <div class="bg-warning bg-opacity-10 rounded-circle p-1 text-warning me-2">
                    <i class="ti ti-clock fs-5"></i>
                  </div>
                  <div>
                    <div class="text-muted mb-0" style="font-size: 0.7rem;">Horas Totales</div>
                    <div class="fw-bold fs-6 text-dark">${finalHoras}h</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border border-light shadow-sm bg-white">
                <div class="card-body p-2 d-flex align-items-center">
                  <div class="bg-danger bg-opacity-10 rounded-circle p-1 text-danger me-2">
                    <i class="ti ti-timer fs-5"></i>
                  </div>
                  <div>
                    <div class="text-muted mb-0" style="font-size: 0.7rem;">Minutos Totales</div>
                    <div class="fw-bold fs-6 text-dark">${finalMinutos}m</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="fw-bold mb-0 text-dark fs-6"><i class="ti ti-box-model-2 me-2 text-muted"></i>Productos y Desglose de Piezas</h6>
            <span class="badge bg-light text-muted border px-2 py-1" style="font-size: 0.75rem;">
              ${itemsParaMostrar.length} ${itemsParaMostrar.length === 1 ? 'producto/ítem' : 'productos/ítems'}
            </span>
          </div>
          ${productosHtml}
        </div>
      </div>
    `,
    customClass: {
      popup: 'rounded-4 bg-white',
      title: 'border-bottom pb-2 mb-0'
    },
    width: '950px',
    showCloseButton: true,
    showConfirmButton: false,
    didOpen: (popup) => {
      const headers = popup.querySelectorAll('.item-toggle-header');
      headers.forEach(header => {
        header.addEventListener('click', () => {
          const targetId = header.getAttribute('data-target');
          if (!targetId) return;
          const drawer = popup.querySelector(`#${targetId}`);
          if (drawer) {
            const isHidden = drawer.classList.contains('d-none');
            drawer.classList.toggle('d-none', !isHidden);
            const idx = targetId.replace('drawer-item-', '');
            const icon = popup.querySelector(`.chevron-icon-${idx}`);
            if (icon) {
              icon.classList.toggle('ti-chevron-up', isHidden);
              icon.classList.toggle('ti-chevron-down', !isHidden);
            }
          }
        });
      });
    }
  });
}
