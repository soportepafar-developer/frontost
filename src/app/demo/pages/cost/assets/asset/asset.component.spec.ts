import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AssetComponent } from './asset.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Asset } from '../../../../../core/models/Cost/asset';

describe('AssetComponent', () => {
  let component: AssetComponent;
  let fixture: ComponentFixture<AssetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AssetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should normalize string and null values into numbers cleanly', () => {
    expect(component.normalizarNumero(null)).toBe(0);
    expect(component.normalizarNumero(undefined)).toBe(0);
    expect(component.normalizarNumero('150.50')).toBe(150.50);
    expect(component.normalizarNumero('invalid')).toBe(0);
    expect(component.normalizarNumero(200)).toBe(200);
  });

  it('should correctly calculate annual depreciation', () => {
    const asset = {
      nombre: 'Impresora 3D',
      tipo: 'Fijo',
      costoInicial: 1000,
      valorResidual: 100,
      vidaUtil: 10
    } as unknown as Asset;
    // (1000 - 100) / 10 = 90
    const depAnual = component.calcularDepreciacionAnual(asset);
    expect(depAnual).toBe(90);
  });

  it('should correctly calculate monthly depreciation', () => {
    const asset = {
      nombre: 'Impresora 3D',
      tipo: 'Fijo',
      costoInicial: 1000,
      valorResidual: 100,
      vidaUtil: 10
    } as unknown as Asset;
    // (1000 - 100) / 10 / 12 = 7.5
    const depMensual = component.calcularDepreciacionMensual(asset);
    expect(depMensual).toBe(7.5);
  });

  it('should return 0 depreciation when valorResidual exceeds costoInicial or vidaUtil is 0', () => {
    const asset = {
      nombre: 'Equipo Erróneo',
      tipo: 'Fijo',
      costoInicial: 500,
      valorResidual: 600,
      vidaUtil: 5
    } as unknown as Asset;
    expect(component.calcularDepreciacionAnual(asset)).toBe(0);
  });

  it('should filter fixed assets by technology when under Equipos de fabricacion', () => {
    component.activeTab = 'fijo';
    component.allAssets = [
      { id: 1, nombre: 'Bambu Lab X1', tipo: 'Fijo', categoria: 'Equipos de fabricación', tecnologia: 'FDM', costoInicial: 1000, vidaUtil: 5 } as Asset,
      { id: 2, nombre: 'Anycubic Photon', tipo: 'Fijo', categoria: 'Equipos de fabricación', tecnologia: 'SLA', costoInicial: 500, vidaUtil: 3 } as Asset
    ];
    component.selectedCategory = 'Equipos de fabricación';
    expect(component.esCategoriaFabricacion()).toBeTrue();

    component.selectedTecnologia = 'FDM';
    component.applyFilterAndPagination();
    expect(component.filteredAssets.length).toBe(1);
    expect(component.filteredAssets[0].nombre).toBe('Bambu Lab X1');
  });

  it('should filter materials by technology and brand', () => {
    component.activeTab = 'material';
    component.allAssets = [
      { id: 10, nombre: 'PLA Blanco', tipo: 'Material', categoria: 'Filamento', marca: 'eSun', costoInicial: 20, cantidad: 5 } as Asset,
      { id: 11, nombre: 'PLA Gris', tipo: 'Material', categoria: 'Filamento', marca: 'Bambu Lab', costoInicial: 25, cantidad: 3 } as Asset,
      { id: 12, nombre: 'Resina Estándar', tipo: 'Material', categoria: 'Resina', marca: 'Anycubic', costoInicial: 35, cantidad: 2 } as Asset
    ];

    component.selectedTecnologia = 'FDM';
    component.selectedMarca = 'eSun';
    component.applyFilterAndPagination();

    expect(component.filteredAssets.length).toBe(1);
    expect(component.filteredAssets[0].nombre).toBe('PLA Blanco');
  });

  it('should reset all filters on clearFilters()', () => {
    component.searchTerm = 'bambu';
    component.selectedCategory = 'Filamento';
    component.selectedTecnologia = 'FDM';
    component.selectedMarca = 'Bambu Lab';

    component.clearFilters();

    expect(component.searchTerm).toBe('');
    expect(component.selectedCategory).toBeNull();
    expect(component.selectedTecnologia).toBeNull();
    expect(component.selectedMarca).toBeNull();
  });

  it('should dynamically cascade brand options when technology changes', () => {
    component.allAssets = [
      { id: 10, nombre: 'PLA Blanco', tipo: 'Material', categoria: 'Filamento', marca: 'eSun' } as Asset,
      { id: 11, nombre: 'PLA Gris', tipo: 'Material', categoria: 'Filamento', marca: 'Bambu Lab' } as Asset,
      { id: 12, nombre: 'Resina Estándar', tipo: 'Material', categoria: 'Resina', marca: 'Anycubic' } as Asset
    ];
    component.marcasList = ['Anycubic', 'Bambu Lab', 'eSun'];

    // Con FDM, solo deben aparecer Bambu Lab y eSun
    component.selectedTecnologia = 'FDM';
    component.onTecnologiaChange();
    expect(component.marcasFiltradasList).toEqual(['Bambu Lab', 'eSun']);

    // Si estaba seleccionada 'Anycubic' (SLA) y cambiamos a FDM, debe resetearse selectedMarca
    component.selectedMarca = 'Anycubic';
    component.selectedTecnologia = 'FDM';
    component.actualizarOpcionesFiltros();
    expect(component.selectedMarca).toBeNull();
  });

  it('should dynamically cascade categories and technologies together', () => {
    component.activeTab = 'material';
    component.allAssets = [
      { id: 10, nombre: 'PLA Blanco', tipo: 'Material', categoria: 'Filamento', marca: 'eSun', tecnologia: 'FDM' } as Asset,
      { id: 12, nombre: 'Resina Estándar', tipo: 'Material', categoria: 'Resina', marca: 'Anycubic', tecnologia: 'SLA' } as Asset
    ];
    component.tecnologiasList = [
      { id: 1, codigo: 'FDM', nombre: 'Filamento' },
      { id: 2, codigo: 'SLA', nombre: 'Resina' }
    ];

    // Al seleccionar SLA, solo debe aparecer la categoría 'Resina'
    component.selectedTecnologia = 'SLA';
    component.onTecnologiaChange();
    expect(component.categoriasList).toEqual(['Resina']);

    // Al cambiar la categoría a 'Filamento', la tecnología SLA debe resetearse o actualizarse
    component.selectedCategory = 'Filamento';
    component.onCategoryChange();
    expect(component.tecnologiasFiltradasList.map(t => t.codigo)).toEqual(['FDM']);
    expect(component.selectedTecnologia).toBeNull();
  });
});
