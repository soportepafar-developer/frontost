import {
  CANTIDAD_MAXIMA_CNC,
  DESCARTE_RESINA_POR_DEFECTO,
  agruparPiezasPorEquipo,
  asignarHorasDeBloque,
  calcularAreaCm2,
  materialAprobadoParaCorte,
  mensajeValidacionPieza,
  obtenerTecnologiasDisponibles,
  reglasDePieza,
  textoMedidaPieza
} from './piece-tech-rules';
import {
  calcularPrecioPorCm2,
  resolverNombreMaquina,
  resolverNombreMaterial
} from './piece-builder.helper';
import { mapDbPiezasToView } from './product-form.helper';
import { Asset } from '../models/Cost/asset';

describe('piece-tech-rules', () => {
  it('deja filamento como está hoy', () => {
    const reglas = reglasDePieza('FDM');
    expect(reglas.mostrarGramos).toBeTrue();
    expect(reglas.mostrarDimensiones).toBeFalse();
    expect(reglas.etiquetaTipoMaterial).toBe('Tipo de polímero');
  });

  it('en resina cambia la etiqueta, autoselecciona y pide descartables', () => {
    const reglas = reglasDePieza('SLA');
    expect(reglas.etiquetaTipoMaterial).toBe('Tipo de resina');
    expect(reglas.autoseleccionarInsumo).toBeTrue();
    expect(reglas.mostrarDescartables).toBeTrue();
    expect(reglas.descartablesPorDefecto).toBe(DESCARTE_RESINA_POR_DEFECTO);
  });

  it('en control numérico limita a 5 y pide medidas de la placa', () => {
    const reglas = reglasDePieza('CNC');
    expect(reglas.cantidadMaxima).toBe(CANTIDAD_MAXIMA_CNC);
    expect(reglas.mostrarTipoMaterial).toBeFalse();
    expect(reglas.mostrarMarca).toBeFalse();
    expect(reglas.mostrarGramos).toBeFalse();
    expect(reglas.mostrarDimensiones).toBeTrue();
    expect(reglas.mostrarCarasPcb).toBeTrue();
    expect(calcularAreaCm2(10, 5)).toBe(50);
    expect(mensajeValidacionPieza('CNC', { cantidad: 6, anchoCm: 10, largoCm: 5, carasPcb: 1 }))
      .toContain('1 a 5');
  });

  it('en corte láser solo deja los materiales aprobados', () => {
    const reglas = reglasDePieza('LSR');
    expect(reglas.mostrarMarca).toBeFalse();
    expect(reglas.usaSuperficie).toBeTrue();
    expect(materialAprobadoParaCorte('Acrílico negro')).toBeTrue();
    expect(materialAprobadoParaCorte('Acrílico transparente')).toBeFalse();
    expect(materialAprobadoParaCorte('Vinilo')).toBeTrue();
  });

  it('en chocolate oculta color, muestra Tipo de material y separa limpieza y empaque', () => {
    const reglas = reglasDePieza('CHO');
    expect(reglas.etiquetaTipoMaterial).toBe('Tipo de material');
    expect(reglas.mostrarColor).toBeFalse();
    expect(reglas.mostrarLimpieza).toBeTrue();
    expect(reglas.mostrarEmpaque).toBeTrue();
    expect(reglas.autoseleccionarInsumo).toBeTrue();
  });

  it('en alimentos no descuenta inventario y pide texto y costo', () => {
    const reglas = reglasDePieza('ALM');
    expect(reglas.mostrarMaterialInsumo).toBeFalse();
    expect(reglas.descuentaInventario).toBeFalse();
    expect(mensajeValidacionPieza('ALM', { cantidad: 1, materialLibre: '', costoEstimado: 2 }))
      .toContain('material');
  });

  it('agrupa piezas por tecnología y equipo y asigna horas totales por bloque', () => {
    const piezas = [
      { tipo: 'Fabricada', tecnologia: 'FDM', maquinaNombre: 'Prusa', horas: 1, minutos: 30, cantidad: 2 },
      { tipo: 'Fabricada', tecnologia: 'FDM', maquinaNombre: 'Prusa', horas: 0, minutos: 0, cantidad: 1 },
      { tipo: 'Fabricada', tecnologia: 'SLA', maquinaNombre: 'Form', horas: 1, minutos: 0, cantidad: 1 },
      { tipo: 'Del Inventario', nombre: 'Tornillo', cantidad: 4 }
    ];
    const bloques = agruparPiezasPorEquipo(piezas);
    expect(bloques.length).toBe(3);
    const filamento = bloques.find(b => b.tecnologia === 'FDM');
    expect(filamento?.esInventario).toBeFalse();
    expect(filamento?.totalMinutos).toBe(90);
    expect(filamento?.horas).toBe(1);
    expect(filamento?.minutos).toBe(30);

    const inventario = bloques.find(b => b.tecnologia === 'Inventario');
    expect(inventario?.esInventario).toBeTrue();

    asignarHorasDeBloque(piezas, filamento!.clave, 2, 75);
    expect(piezas[0].horas).toBe(3);
    expect(piezas[0].minutos).toBe(15);
    expect(piezas[1].horas).toBe(0);
    expect(piezas[1].minutos).toBe(0);
  });

  it('muestra área en control numérico, gramos en filamento y guion en alimentos', () => {
    expect(textoMedidaPieza({ tecnologia: 'CNC', anchoCm: 10, largoCm: 2, cantidad: 2 })).toBe('40 cm²');
    expect(textoMedidaPieza({ tecnologia: 'FDM', gramos: 10, cantidad: 2 })).toBe('20 g');
    expect(textoMedidaPieza({ tecnologia: 'ALM', materialLibre: 'Glaseado real', cantidad: 1 })).toBe('-');
  });

  it('calcula precio por cm² sin dividir entre 1000 y convierte desde m²', () => {
    expect(calcularPrecioPorCm2({ valorUnitario: 0.05, unidadMedida: 'cm²' } as Asset)).toBe(0.05);
    expect(calcularPrecioPorCm2({ valorUnitario: 50, unidadMedida: 'm²' } as Asset)).toBe(0.005);
    expect(calcularPrecioPorCm2({ valorUnitario: 12, unidadMedida: 'Unidades' } as Asset)).toBe(12);
  });

  it('resuelve MaquinaNombre, MaterialNombre y materialLibre al cargar piezas', () => {
    expect(resolverNombreMaquina({ MaquinaNombre: 'Router CNC' }, [])).toBe('Router CNC');
    expect(resolverNombreMaterial({ MaterialNombre: 'Acrílico Negro 3mm' }, [])).toBe('Acrílico Negro 3mm');
    expect(resolverNombreMaterial({ materialLibre: 'Masa dulce' }, [])).toBe('Masa dulce');
  });

  it('en multitecnología permite agregar más piezas de una misma tecnología ya usada', () => {
    const tecnologias = [
      { id: 1, codigo: 'FDM', nombre: 'Filamento' },
      { id: 2, codigo: 'SLA', nombre: 'Resina' },
      { id: 3, codigo: 'CNC', nombre: 'Control numérico' }
    ];
    expect(obtenerTecnologiasDisponibles(tecnologias, ['FDM'], false).map(t => t.codigo)).toEqual(['FDM']);
    expect(obtenerTecnologiasDisponibles(tecnologias, ['FDM', 'SLA'], true).map(t => t.codigo)).toEqual(['FDM', 'SLA', 'CNC']);
  });

  it('extrae ids de objetos anidados maquina y activo y parsea numeros string en mapDbPiezasToView', () => {
    const mapped = mapDbPiezasToView([
      {
        id: 13,
        nombre: 'ejemplo cnc',
        cantidad: 1,
        gramos: '0.00',
        metros: '0.00',
        horas: 2,
        minutos: 0,
        precioMaterial: '0.05',
        tipo: 'Fabricada',
        tecnologia: 'CNC',
        activo: { id: 496, nombre: 'Placa PCB FR4' },
        maquina: { id: 10, nombre: 'CNC 3D3 MEDIANO' },
        anchoCm: '20.00',
        largoCm: '20.00',
        areaCm2: '400.00',
        maquinaNombre: 'CNC 3D3 MEDIANO',
        materialNombre: 'Placa PCB FR4'
      }
    ], [], [], [], []);

    expect(mapped.length).toBe(1);
    expect(mapped[0].maquina).toBe(10);
    expect(mapped[0].activo).toBe(496);
    expect(mapped[0].maquinaNombre).toBe('CNC 3D3 MEDIANO');
    expect(mapped[0].activoNombre).toBe('Placa PCB FR4');
    expect(mapped[0].gramos).toBe(0);
    expect(mapped[0].areaCm2).toBe(400);
    expect(mapped[0].precioMaterial).toBe(0.05);
  });
});
