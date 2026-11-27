import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AddProductComponent } from './add-product.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Asset } from '../../../../../core/models/Cost/asset';

describe('AddProductComponent', () => {
  let component: AddProductComponent;
  let fixture: ComponentFixture<AddProductComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddProductComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddProductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize product form correctly', () => {
    expect(component.form.get('clasificacion')?.value).toBe('');
    expect(component.form.get('piezaCantidad')?.value).toBe(1);
    expect(component.form.get('piezaTipo')?.value).toBe('Del Inventario');
  });

  it('should allow adding manufactured parts to piezasPendientes array', () => {
    component.form.patchValue({
      piezaTipo: 'Fabricada',
      piezaTecnologia: 'FDM',
      piezaFabricada: 'Tapa Frontal',
      piezaCantidad: 2,
      piezaGramos: 150,
      piezaMaterialId: 10
    });

    component.activosMateriales = [
      { id: 10, nombre: 'Filamento ABS', tipo: 'Material' } as unknown as Asset
    ];

    component.agregarPieza();

    expect(component.piezasPendientes.length).toBe(1);
    expect(component.piezasPendientes[0]['nombre']).toBe('Tapa Frontal');
    expect(component.piezasPendientes[0]['cantidad']).toBe(2);
    expect(component.piezasPendientes[0]['horas']).toBe(0);
  });

  it('nombra sola la pieza si no escriben nombre y permite asignar horas al bloque completo', () => {
    component.form.patchValue({
      piezaTipo: 'Fabricada',
      piezaTecnologia: 'FDM',
      piezaFabricada: '',
      piezaCantidad: 1,
      piezaGramos: 10,
      piezaMaterialId: 10
    });
    component.activosMateriales = [
      { id: 10, nombre: 'Filamento PLA', tipo: 'Material', subCategoria: 'PLA' } as unknown as Asset
    ];
    component.agregarPieza();
    expect(component.piezasPendientes[0]['nombre']).toBe('Pieza 1');
    expect(component.piezasPendientes[0]['horas']).toBe(0);
    expect(component.piezasPendientes[0]['minutos']).toBe(0);

    component.form.patchValue({
      piezaTipo: 'Fabricada',
      piezaTecnologia: 'FDM',
      piezaFabricada: 'Pieza 2',
      piezaCantidad: 2,
      piezaGramos: 20,
      piezaMaterialId: 10
    });
    component.agregarPieza();

    const clave = component.bloquesPiezas[0].clave;
    component.onTiempoBloqueChange(clave, 2, 15);
    expect(component.bloquesPiezas[0].horas).toBe(2);
    expect(component.bloquesPiezas[0].minutos).toBe(15);

    component.removerPieza(0);
    expect(component.bloquesPiezas[0].horas).toBe(2);
    expect(component.bloquesPiezas[0].minutos).toBe(15);
  });

  it('en control numérico pide medidas y no exige polímero', () => {
    component.form.patchValue({
      piezaTipo: 'Fabricada',
      piezaTecnologia: 'CNC',
      piezaFabricada: 'Placa',
      piezaCantidad: 2,
      piezaAnchoCm: 10,
      piezaLargoCm: 5,
      piezaCarasPcb: 2,
      piezaMascaraUvSoldadura: true,
      piezaMascaraUvTextos: false
    });
    component.agregarPieza();
    expect(component.piezasPendientes.length).toBe(1);
    expect(component.piezasPendientes[0].anchoCm).toBe(10);
    expect(component.piezasPendientes[0].areaCm2).toBe(50);
    expect(component.piezasPendientes[0].carasPcb).toBe(2);
  });

  it('con multitecnología activa permite agregar varias piezas de la misma tecnología y de otras', () => {
    component.tecnologias = [
      { id: 1, codigo: 'FDM', nombre: 'Filamento' },
      { id: 2, codigo: 'SLA', nombre: 'Resina' }
    ];
    component.activosMateriales = [
      { id: 10, nombre: 'Filamento PLA', tipo: 'Material', categoria: 'Filamento' } as unknown as Asset,
      { id: 20, nombre: 'Resina Grey', tipo: 'Material', categoria: 'Resina' } as unknown as Asset
    ];

    component.form.patchValue({
      multitecnologia: true,
      piezaTipo: 'Fabricada',
      piezaTecnologia: 'FDM',
      piezaFabricada: 'Cuerpo',
      piezaCantidad: 1,
      piezaGramos: 50,
      piezaMaterialId: 10
    });
    component.agregarPieza();

    expect(component.tecnologiasDisponiblesPieza.map(t => t.codigo)).toEqual(['FDM', 'SLA']);
    expect(component.form.get('piezaTecnologia')?.value).toBe('FDM');

    component.form.patchValue({
      piezaFabricada: 'Tapa',
      piezaCantidad: 1,
      piezaGramos: 30,
      piezaMaterialId: 10
    });
    component.agregarPieza();

    component.form.patchValue({
      piezaTecnologia: 'SLA',
      piezaFabricada: 'Visor',
      piezaCantidad: 1,
      piezaGramos: 15,
      piezaMaterialId: 20
    });
    component.agregarPieza();

    expect(component.piezasPendientes.length).toBe(3);
    expect(component.piezasPendientes.filter(p => p.tecnologia === 'FDM').length).toBe(2);
    expect(component.piezasPendientes.filter(p => p.tecnologia === 'SLA').length).toBe(1);
  });

  it('should reset form and pending parts cleanly via reiniciarFormulario()', () => {
    component.form.patchValue({ nombre: 'Prueba', descripcion: 'Desc' });
    component.piezasPendientes = [{ id: 1, nombre: 'Pieza 1' }];
    component.previewSku = 'SKU-123';

    component.reiniciarFormulario();

    expect(component.piezasPendientes.length).toBe(0);
    expect(component.previewSku).toBe('');
    expect(component.form.get('nombre')?.value).toBe('');
    expect(component.form.dirty).toBeFalse();
    expect(component.canDeactivate()).toBeTrue();
  });
});
