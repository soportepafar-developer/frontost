import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ProductComponent, ProductWithProfile } from './product.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProductService } from '../../../../../core/services/cost/product.service';
import { ConfigService } from '../../../../../core/services/cost/config.service';
import { AssetService } from '../../../../../core/services/cost/asset.service';

describe('ProductComponent', () => {
  let component: ProductComponent;
  let fixture: ComponentFixture<ProductComponent>;

  const mockProductService = {
    getProducts: () => of([
      {
        id: 1,
        nombre: 'Caja Protectora',
        sku: 'P-FDM-ABS-IND-01',
        clasificacion: 'Producto',
        tecnologia: 'FDM',
        material: 'ABS',
        piezasProducto: [
          { nombre: 'Carcasa Superior', cantidad: 1, tecnologia: 'FDM', gramos: 80 }
        ]
      }
    ]),
    getProduct: (id: number) => of({
      id,
      nombre: 'Caja Protectora',
      sku: 'P-FDM-ABS-IND-01',
      clasificacion: 'Producto',
      tecnologia: 'FDM',
      material: 'ABS',
      piezasProducto: [
        { nombre: 'Carcasa Superior', cantidad: 1, tecnologia: 'FDM', gramos: 80 }
      ]
    })
  };

  const mockConfigService = {
    getConfigs: () => of([])
  };

  const mockAssetService = {
    getAssets: () => of([])
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ProductService, useValue: mockProductService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AssetService, useValue: mockAssetService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create product component', () => {
    expect(component).toBeTruthy();
  });

  it('should detect if a product has pieces using tienePiezas', () => {
    const withPieces: ProductWithProfile = {
      id: 1,
      nombre: 'Pieza A',
      sku: 'P-01',
      clasificacion: 'Producto',
      medida: 'unid',
      descripcion: 'test',
      perfil: 1,
      piezasProducto: [{ nombre: 'P1', cantidad: 1 }]
    };
    const withoutPieces: ProductWithProfile = {
      id: 2,
      nombre: 'Servicio B',
      sku: 'S-01',
      clasificacion: 'Servicio',
      medida: 'unid',
      descripcion: 'test',
      perfil: 1,
      piezasProducto: []
    };

    expect(component.tienePiezas(withPieces)).toBeTrue();
    expect(component.tienePiezas(withoutPieces)).toBeFalse();
  });

  it('should open details modal on onViewDetails', () => {
    const testProd: ProductWithProfile = {
      id: 1,
      nombre: 'Caja Protectora',
      sku: 'P-FDM-ABS-IND-01',
      clasificacion: 'Producto',
      tecnologia: 'FDM',
      material: 'ABS',
      medida: 'unid',
      descripcion: 'Caja para circuito',
      perfil: 1,
      piezasProducto: [
        { nombre: 'Carcasa Superior', cantidad: 1, tecnologia: 'FDM', gramos: 80 }
      ]
    };

    component.onViewDetails(testProd);

    expect(component.showDetailsModal).toBeTrue();
    expect(component.selectedProductForModal).toBeTruthy();
    expect(component.selectedProductForModal?.nombre).toBe('Caja Protectora');
    expect(component.selectedProductForModal?.piezasProducto?.length).toBe(1);
  });

  it('should close details modal on closeDetailsModal', () => {
    const modalProd: ProductWithProfile = {
      id: 1,
      nombre: 'Test',
      sku: 'P-01',
      clasificacion: 'Producto',
      medida: 'unid',
      descripcion: 'test',
      perfil: 1
    };
    component.showDetailsModal = true;
    component.selectedProductForModal = modalProd;

    component.closeDetailsModal();

    expect(component.showDetailsModal).toBeFalse();
    expect(component.selectedProductForModal).toBeNull();
  });

  it('should group modal pieces by technology and machine with exact block hours', () => {
    component.selectedProductForModal = {
      id: 39,
      nombre: 'Ejemplo',
      sku: 'PF-M-CHO/CNC/SLA-CHOCOLATE/PCB/RES-LUD-JM01',
      clasificacion: 'Producto',
      medida: 'Unidades',
      descripcion: 'Test',
      perfil: 4,
      tasaFallo: 5,
      tasasFallo: 'CHO:5,CNC:11,SLA:18',
      piezasProducto: [
        { id: 11, nombre: 'ejemplo cho', tipo: 'Fabricada', tecnologia: 'CHO', maquinaNombre: 'Impresora CHO', horas: 10, minutos: 0, gramos: 20 },
        { id: 12, nombre: 'ejemplo cho 2', tipo: 'Fabricada', tecnologia: 'CHO', maquinaNombre: 'Impresora CHO', horas: 0, minutos: 0, gramos: 0 },
        { id: 13, nombre: 'ejemplo cnc', tipo: 'Fabricada', tecnologia: 'CNC', maquinaNombre: 'CNC ORINOCO', horas: 2, minutos: 0, areaCm2: 400, gramos: 0 },
        { id: 14, nombre: 'ejemplo sla', tipo: 'Fabricada', tecnologia: 'SLA', maquinaNombre: 'Mono M5', horas: 10, minutos: 0, gramos: 20 },
        { id: 15, nombre: 'tornillo', tipo: 'Del Inventario', cantidad: 4 }
      ]
    };

    const bloques = component.bloquesPiezasModal;
    expect(bloques.length).toBe(4);
    expect(bloques[0].tecnologia).toBe('CHO');
    expect(bloques[0].piezas.length).toBe(2);
    expect(bloques[0].horas).toBe(10);
    expect(bloques[0].minutos).toBe(0);

    expect(bloques[1].tecnologia).toBe('CNC');
    expect(bloques[1].horas).toBe(2);

    expect(bloques[2].tecnologia).toBe('SLA');
    expect(bloques[2].horas).toBe(10);

    expect(bloques[3].esInventario).toBeTrue();
  });

  it('should read block failure rate from tasasFallo with fallback to tasaFallo', () => {
    component.selectedProductForModal = {
      id: 39,
      nombre: 'Ejemplo',
      sku: 'PF-M-01',
      clasificacion: 'Producto',
      medida: 'Unidades',
      descripcion: 'Test',
      perfil: 4,
      tasaFallo: 5,
      tasasFallo: 'CHO:5,CNC:11,SLA:18',
      piezasProducto: [
        { nombre: 'cho', tipo: 'Fabricada', tecnologia: 'CHO', maquinaNombre: 'CHO1', horas: 1 },
        { nombre: 'cnc', tipo: 'Fabricada', tecnologia: 'CNC', maquinaNombre: 'CNC1', horas: 1 },
        { nombre: 'fdm', tipo: 'Fabricada', tecnologia: 'FDM', maquinaNombre: 'FDM1', horas: 1 },
        { nombre: 'tornillo', tipo: 'Del Inventario' }
      ]
    };

    const bloques = component.bloquesPiezasModal;
    expect(component.tasaFalloDeBloque(bloques[0])).toBe(5);
    expect(component.tasaFalloDeBloque(bloques[1])).toBe(11);
    expect(component.tasaFalloDeBloque(bloques[2])).toBe(5);
    expect(component.tasaFalloDeBloque(bloques[3])).toBeNull();
  });

  it('should render cm² for CNC even when gramos is 0, g for CHO/SLA, and - when zero', () => {
    expect(component.textoMedida({ tecnologia: 'CNC', areaCm2: 400, gramos: 0, cantidad: 1 })).toBe('400 cm²');
    expect(component.textoMedida({ tecnologia: 'CHO', gramos: 20, cantidad: 1 })).toBe('20 g');
    expect(component.textoMedida({ tecnologia: 'CHO', gramos: 0, cantidad: 1 })).toBe('-');
  });
});
