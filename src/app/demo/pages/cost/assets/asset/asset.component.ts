import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Asset } from '../../../../../core/models/Cost/asset';
import { AssetService } from '../../../../../core/services/cost/asset.service';
import { CatalogConfigService } from '../../../../../core/services/cost/catalog-config.service';
import { TecnologiaCatalogo } from '../../../../../core/models/Cost/catalog-config';
import { calcularValorTotalActivo } from '../../../../../core/utils/asset-form.helper';
import {
  esEquiposFabricacion,
  tecnologiaDeActivo,
  materialCompatibleConTecnologia
} from '../../../../../core/constants/asset-categories';

@Component({
  selector: 'app-asset',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule],
  templateUrl: './asset.component.html'
})
export class AssetComponent implements OnInit {
  private router = inject(Router);
  private assetService = inject(AssetService);
  private catalogConfigService = inject(CatalogConfigService);

  private cdr = inject(ChangeDetectorRef);
  loading = true;
  selectedRow: Asset | null = null;
  activeTab = 'fijo'; // fijo or circulante

  allAssets: Asset[] = [];
  filteredAssets: Asset[] = [];
  paginatedAssets: Asset[] = [];

  totalFijos = 0;
  totalCirculantes = 0;
  totalMateriales = 0;

  searchTerm = '';
  selectedCategory: string | null = null;
  selectedTecnologia: string | null = null;
  selectedMarca: string | null = null;

  categoriasList: string[] = [];
  tecnologiasList: TecnologiaCatalogo[] = [];
  tecnologiasFiltradasList: TecnologiaCatalogo[] = [];
  marcasList: string[] = [];
  marcasFiltradasList: string[] = [];

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  totalPagesArray: number[] = [];
  sortColumn = 'nombre';
  sortAscending = true;

  Math = Math;

  ngOnInit(): void {
    this.cargarCatalogos();
    this.getAssets();
  }

  cargarCatalogos(): void {
    this.catalogConfigService.getTecnologias().subscribe({
      next: (data) => {
        this.tecnologiasList = data?.length ? data : [
          { id: 1, codigo: 'FDM', nombre: 'Filamento' },
          { id: 2, codigo: 'SLA', nombre: 'Resina' }
        ];
        this.tecnologiasFiltradasList = [...this.tecnologiasList];
      },
      error: () => {
        this.tecnologiasList = [
          { id: 1, codigo: 'FDM', nombre: 'Filamento' },
          { id: 2, codigo: 'SLA', nombre: 'Resina' }
        ];
        this.tecnologiasFiltradasList = [...this.tecnologiasList];
      }
    });

    this.catalogConfigService.getMarcas().subscribe({
      next: (data) => {
        const marcasConfig = (data || []).map(m => m.nombre).filter(Boolean);
        this.actualizarMarcasDisponibles(marcasConfig);
      },
      error: () => {
        this.actualizarMarcasDisponibles([]);
      }
    });
  }

  actualizarMarcasDisponibles(marcasBase: string[] = []): void {
    const setMarcas = new Set<string>(marcasBase);
    this.allAssets.forEach(a => {
      const m = (a.marca || '').trim();
      if (m) setMarcas.add(m);
    });
    this.marcasList = Array.from(setMarcas).sort((a, b) => a.localeCompare(b));
    this.actualizarOpcionesFiltros();
  }

  getAssetsDePestanaActual(): Asset[] {
    return this.allAssets.filter(item => {
      const tipoLower = item.tipo?.toLowerCase().trim() || '';
      const catLower = item.categoria?.toLowerCase().trim() || '';

      if (this.activeTab === 'fijo') {
        return tipoLower === 'fijo' || (!item.tipo && item.vidaUtil > 0);
      } else if (this.activeTab === 'material') {
        return tipoLower === 'material' || catLower.includes('material') || catLower.includes('insumo') || catLower.includes('filamento') || catLower.includes('resina');
      } else {
        return (tipoLower === 'circulante' || !item.tipo) && tipoLower !== 'fijo' && tipoLower !== 'material' && !catLower.includes('material') && !catLower.includes('insumo') && !catLower.includes('filamento') && !catLower.includes('resina');
      }
    });
  }

  esCategoriaFabricacion(): boolean {
    return esEquiposFabricacion(this.selectedCategory || '');
  }

  actualizarOpcionesFiltros(): void {
    const assetsTab = this.getAssetsDePestanaActual();

    if (this.activeTab !== 'material') {
      const uniqueMap = new Map<string, string>();
      assetsTab.forEach(a => {
        const rawCat = (a.categoria || ((a as unknown as Record<string, unknown>)['Categoria'] as string) || '').trim();
        if (rawCat) {
          const key = rawCat.toLowerCase();
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, rawCat.charAt(0).toUpperCase() + rawCat.slice(1));
          }
        }
      });
      this.categoriasList = Array.from(uniqueMap.values()).sort();
      this.tecnologiasFiltradasList = [...this.tecnologiasList];
      return;
    }

    // --- Pestaña Material: Cascada bidireccional entre Categoría, Tecnología y Marca ---

    // 1. Categorías disponibles (restringidas por tecnología y marca seleccionadas)
    const catMap = new Map<string, string>();
    assetsTab.forEach(a => {
      const coincideTec = !this.selectedTecnologia || materialCompatibleConTecnologia(a, this.selectedTecnologia);
      const coincideMarca = !this.selectedMarca || (a.marca || '').toLowerCase().trim() === this.selectedMarca.toLowerCase().trim();

      if (coincideTec && coincideMarca) {
        const rawCat = (a.categoria || ((a as unknown as Record<string, unknown>)['Categoria'] as string) || '').trim();
        if (rawCat) {
          const key = rawCat.toLowerCase();
          if (!catMap.has(key)) {
            catMap.set(key, rawCat.charAt(0).toUpperCase() + rawCat.slice(1));
          }
        }
      }
    });
    this.categoriasList = Array.from(catMap.values()).sort();
    if (this.selectedCategory && !catMap.has(this.selectedCategory.toLowerCase().trim())) {
      this.selectedCategory = null;
    }

    // 2. Tecnologías disponibles (restringidas por categoría y marca seleccionadas)
    const tecValidas = new Set<string>();
    assetsTab.forEach(a => {
      const rawCat = (a.categoria || ((a as unknown as Record<string, unknown>)['Categoria'] as string) || '').trim().toLowerCase();
      const coincideCat = !this.selectedCategory || rawCat === this.selectedCategory.toLowerCase().trim();
      const coincideMarca = !this.selectedMarca || (a.marca || '').toLowerCase().trim() === this.selectedMarca.toLowerCase().trim();

      if (coincideCat && coincideMarca) {
        const tec = tecnologiaDeActivo(a);
        if (tec) tecValidas.add(tec.toUpperCase());
        if (rawCat.includes('filam') || rawCat === 'fdm') tecValidas.add('FDM');
        if (rawCat.includes('resin') || rawCat === 'sla') tecValidas.add('SLA');
      }
    });

    if (!this.selectedCategory && !this.selectedMarca) {
      this.tecnologiasFiltradasList = [...this.tecnologiasList];
    } else {
      this.tecnologiasFiltradasList = this.tecnologiasList.filter(t => tecValidas.has(t.codigo.toUpperCase()));
    }
    if (this.selectedTecnologia && !tecValidas.has(this.selectedTecnologia.toUpperCase())) {
      this.selectedTecnologia = null;
    }

    // 3. Marcas disponibles (restringidas por categoría y tecnología seleccionadas)
    const marcasSet = new Set<string>();
    assetsTab.forEach(a => {
      const rawCat = (a.categoria || ((a as unknown as Record<string, unknown>)['Categoria'] as string) || '').trim().toLowerCase();
      const coincideCat = !this.selectedCategory || rawCat === this.selectedCategory.toLowerCase().trim();
      const coincideTec = !this.selectedTecnologia || materialCompatibleConTecnologia(a, this.selectedTecnologia);

      if (coincideCat && coincideTec) {
        const m = (a.marca || '').trim();
        if (m) marcasSet.add(m);
      }
    });

    this.marcasFiltradasList = Array.from(marcasSet).sort((a, b) => a.localeCompare(b));
    if (this.selectedMarca && !marcasSet.has(this.selectedMarca)) {
      this.selectedMarca = null;
    }
  }

  onCategoryChange() {
    if (this.activeTab === 'fijo' && !this.esCategoriaFabricacion()) {
      this.selectedTecnologia = null;
    }
    this.actualizarOpcionesFiltros();
    this.currentPage = 1;
    this.applyFilterAndPagination();
  }

  onTecnologiaChange() {
    this.actualizarOpcionesFiltros();
    this.currentPage = 1;
    this.applyFilterAndPagination();
  }

  onMarcaChange() {
    this.actualizarOpcionesFiltros();
    this.currentPage = 1;
    this.applyFilterAndPagination();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedCategory = null;
    this.selectedTecnologia = null;
    this.selectedMarca = null;
    this.actualizarOpcionesFiltros();
    this.currentPage = 1;
    this.applyFilterAndPagination();
  }

  normalizarNumero(valor: string | number | null | undefined): number {
    if (valor === null || valor === undefined) return 0;
    if (typeof valor === 'number') return valor;
    const numero = parseFloat(valor);
    return isNaN(numero) ? 0 : numero;
  }

  getAssets() {
    this.loading = true;
    this.assetService.getAssets().subscribe({
      next: (assetsList) => {
        this.allAssets = assetsList.map((item: Asset) => {
          const asset = {
            ...item,
            costoInicial: this.normalizarNumero(item.costoInicial || item.valorUnitario),
            valorResidual: this.normalizarNumero(item.valorResidual),
            vidaUtil: this.normalizarNumero(item.vidaUtil),
            cantidad: this.normalizarNumero(item.cantidad),
            valorUnitario: this.normalizarNumero(item.valorUnitario || item.costoInicial),
            nombre: item.nombre || '',
            descripcion: item.descripcion || '',
            ubicacion: item.ubicacion || '',
            unidadMedida: item.unidadMedida || '',
            presentacion: item.presentacion || '',
            categoria: item.categoria || ((item as unknown as Record<string, unknown>)['Categoria'] as string) || '',
            subCategoria: item.subCategoria || ((item as unknown as Record<string, unknown>)['subcategoria'] as string) || ((item as unknown as Record<string, unknown>)['Subcategoria'] as string) || ((item as unknown as Record<string, unknown>)['SUBCATEGORIA'] as string) || '',
            color: item.color || ((item as unknown as Record<string, unknown>)['color'] as string) || ((item as unknown as Record<string, unknown>)['Color'] as string) || '',
            marca: item.marca || ((item as unknown as Record<string, unknown>)['marca'] as string) || ((item as unknown as Record<string, unknown>)['Marca'] as string) || '',
            tecnologia: item.tecnologia || ((item as unknown as Record<string, unknown>)['Tecnologia'] as string) || ((item as unknown as Record<string, unknown>)['TECNOLOGIA'] as string) || '',
            depMensual: 0,
            depAnual: 0
          };
          asset.depMensual = this.calcularDepreciacionMensual(asset);
          asset.depAnual = this.calcularDepreciacionAnual(asset);
          return asset;
        });

        this.actualizarMarcasDisponibles(this.marcasList);
        this.actualizarOpcionesFiltros();
        this.applyFilterAndPagination();
       
        this.loading = false;
        setTimeout(() => this.cdr.detectChanges(), 50);
      },
      error: (error) => {
        console.error('Error loading assets:', error);
        this.loading = false;
      }
    });
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    this.selectedCategory = null;
    this.selectedTecnologia = null;
    this.selectedMarca = null;
    this.currentPage = 1;
    this.actualizarOpcionesFiltros();
    this.applyFilterAndPagination();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.applyFilterAndPagination();
  }

  applyFilterAndPagination() {
    // Filtrar por tipo
    let temp = this.allAssets.filter(item => {
      const tipoLower = item.tipo?.toLowerCase().trim() || '';
      const catLower = item.categoria?.toLowerCase().trim() || '';

      if (this.activeTab === 'fijo') {
        return tipoLower === 'fijo' || (!item.tipo && item.vidaUtil > 0);
      } else if (this.activeTab === 'material') {
        return tipoLower === 'material' || catLower.includes('material') || catLower.includes('insumo') || catLower.includes('filamento') || catLower.includes('resina');
      } else {
        return (tipoLower === 'circulante' || !item.tipo) && tipoLower !== 'fijo' && tipoLower !== 'material' && !catLower.includes('material') && !catLower.includes('insumo') && !catLower.includes('filamento') && !catLower.includes('resina');
      }
    });

    // Filtrar por categoría
    if (this.selectedCategory) {
      const selCat = this.selectedCategory.toLowerCase().trim();
      temp = temp.filter(item => {
        const cat = item.categoria || ((item as unknown as Record<string, unknown>)['Categoria'] as string) || '';
        return cat.toLowerCase().trim() === selCat;
      });
    }

    // Filtrar por tecnología
    if (this.selectedTecnologia) {
      const tecTarget = this.selectedTecnologia.toUpperCase().trim();
      temp = temp.filter(item => {
        if (this.activeTab === 'material') {
          return materialCompatibleConTecnologia(item, tecTarget);
        }
        const tecActivo = tecnologiaDeActivo(item);
        return tecActivo ? tecActivo.toUpperCase() === tecTarget : (item.tecnologia || '').toUpperCase().trim() === tecTarget;
      });
    }

    // Filtrar por marca (en material o circulante)
    if (this.selectedMarca) {
      const marcaTarget = this.selectedMarca.toLowerCase().trim();
      temp = temp.filter(item => (item.marca || '').toLowerCase().trim() === marcaTarget);
    }

    // Filtrar por búsqueda
    const query = this.searchTerm.toLowerCase().trim();
    if (query) {
      temp = temp.filter(item => 
        item.nombre.toLowerCase().includes(query) ||
        item.descripcion.toLowerCase().includes(query) ||
        (item.marca || '').toLowerCase().includes(query) ||
        (item.subCategoria || '').toLowerCase().includes(query) ||
        (item.color || '').toLowerCase().includes(query) ||
        item.ubicacion.toLowerCase().includes(query)
      );
    }

    // Ordenamiento
    temp.sort((a: Asset, b: Asset) => {
      if (this.sortColumn === 'valorTotal') {
        const valA = this.calcularValorTotal(a);
        const valB = this.calcularValorTotal(b);
        return this.sortAscending ? valA - valB : valB - valA;
      }

      const prop = this.sortColumn as keyof Asset;
      let valA = a[prop];
      let valB = b[prop];
      
      if (valA && typeof valA === "string") valA = valA.toLowerCase();
      if (valB && typeof valB === "string") valB = valB.toLowerCase();

      // Handle Dates
      if (valA instanceof Date && valB instanceof Date) {
        return this.sortAscending ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime();
      }

      if (valA === null || valA === undefined) return this.sortAscending ? 1 : -1;
      if (valB === null || valB === undefined) return this.sortAscending ? -1 : 1;

      if (valA < valB) return this.sortAscending ? -1 : 1;
      if (valA > valB) return this.sortAscending ? 1 : -1;
      return 0;
    });

    this.filteredAssets = temp;

    // Totales
    if (this.activeTab === 'fijo') {
      this.totalFijos = this.filteredAssets.reduce((sum, item) => sum + (item.depMensual || 0), 0);
    } else if (this.activeTab === 'material') {
      this.totalMateriales = this.filteredAssets.reduce((sum, item) => sum + this.calcularValorTotal(item), 0);
    } else {
      this.totalCirculantes = this.filteredAssets.reduce((sum, item) => sum + this.calcularValorTotal(item), 0);
    }

    // Paginación
    this.totalPages = Math.ceil(this.filteredAssets.length / this.pageSize) || 1;
    this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;

    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedAssets = this.filteredAssets.slice(startIndex, startIndex + this.pageSize);
  }

  setPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.applyFilterAndPagination();
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.applyFilterAndPagination();
  }

  sortData(column: string) {
    if (this.sortColumn === column) {
      this.sortAscending = !this.sortAscending;
    } else {
      this.sortColumn = column;
      this.sortAscending = true;
    }
    this.applyFilterAndPagination();
  }

  getSortClass(column: string): string {
    if (this.sortColumn !== column) return 'ti-selector text-muted';
    return this.sortAscending ? 'ti-chevron-up text-primary' : 'ti-chevron-down text-primary';
  }

  calcularDepreciacionAnual(row: Asset): number {
    if (!row.costoInicial || !row.vidaUtil || row.valorResidual > row.costoInicial) {
      return 0;
    }
    return (row.costoInicial - row.valorResidual) / row.vidaUtil;
  }

  calcularDepreciacionMensual(row: Asset): number {
    return this.calcularDepreciacionAnual(row) / 12;
  }

  calcularValorTotal(row: Asset): number {
    return calcularValorTotalActivo(row);
  }

  onEdit(row: Asset) {
    // Transferir datos al formulario a través del state del router
    this.router.navigate(['/assets/add-asset'], { state: { edit_asset: row } });
  }

  openAdd() {
    // Navegar sin state (nuevo registro)
    this.router.navigate(['/assets/add-asset']);
  }
}
