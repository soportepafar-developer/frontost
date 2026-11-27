import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Asset } from '../../../../core/models/Cost/asset';
import { TecnologiaCatalogo } from '../../../../core/models/Cost/catalog-config';
import { StockDisponibilidad, formatAssetOption, resolverNombreMaterial } from '../../../../core/utils/piece-builder.helper';
import {
  BloquePiezas,
  calcularAreaCm2,
  reglasDePieza,
  textoMedidaPieza
} from '../../../../core/utils/piece-tech-rules';

export interface PieceEntryLike {
  id?: number;
  tipo?: string;
  nombre?: string;
  cantidad?: number;
  gramos?: number;
  horas?: number;
  minutos?: number;
  tecnologia?: string;
  precioMaterial?: number;
  maquina?: number;
  maquinaNombre?: string;
  anchoCm?: number;
  largoCm?: number;
  areaCm2?: number;
  materialLibre?: string;
}

@Component({
  selector: 'app-piece-detail-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule],
  templateUrl: './piece-detail-editor.component.html'
})
export class PieceDetailEditorComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() bloques: BloquePiezas<PieceEntryLike>[] = [];
  @Input() tecnologiasDisponibles: TecnologiaCatalogo[] = [];
  @Input() maquinasFiltradas: Asset[] = [];
  @Input() activosCirculantes: Asset[] = [];
  @Input() materialesFiltrados: Asset[] = [];
  @Input() allAssets: Asset[] = [];
  @Input() polimerosPieza: string[] = [];
  @Input() marcasPieza: string[] = [];
  @Input() coloresPieza: string[] = [];
  @Input() siguienteNombrePieza = 'Pieza 1';
  @Input() stockPiezaActual: StockDisponibilidad = {
    disponibleGramos: 0,
    requeridoGramos: 0,
    faltanteGramos: 0,
    estado: 'sin_seleccion',
    mensaje: ''
  };
  @Input() compact = false;
  @Input() tablaArriba = false;
  @Input() tituloAgregar = '';
  @Input() textoVacio = 'No hay piezas configuradas. El formulario no se guarda incompleto.';
  @Input() mostrarCostoColumna = false;
  @Input() resolverMaterialFn?: (pieza: PieceEntryLike) => string;

  @Output() agregarPieza = new EventEmitter<void>();
  @Output() eliminarPieza = new EventEmitter<{ pieza: PieceEntryLike; indice: number }>();
  @Output() tiempoBloqueChange = new EventEmitter<{ clave: string; horas: string | number; minutos: string | number }>();

  get f() {
    return this.form.controls;
  }

  get reglasPieza() {
    return reglasDePieza(this.form?.get('piezaTecnologia')?.value);
  }

  get materialInsumoColClass(): string {
    const r = this.reglasPieza;
    if (r.mostrarCarasPcb) {
      // CNC: Color (2) + Material (4) + Ancho (2) + Largo (2) + Área (2) = 12
      return 'col-md-4';
    }
    const filtros = (r.mostrarTipoMaterial ? 2 : 0) + (r.mostrarMarca ? 2 : 0) + (r.mostrarColor ? 2 : 0);
    const restante = 12 - filtros;
    return restante >= 4 && restante <= 12 ? `col-md-${restante}` : 'col-md-6';
  }

  get areaPiezaActual(): number {
    return calcularAreaCm2(this.form?.get('piezaAnchoCm')?.value, this.form?.get('piezaLargoCm')?.value);
  }

  formatAsset(asset: Asset | unknown): string {
    return formatAssetOption(asset, this.allAssets);
  }

  medidaDePieza(pieza: PieceEntryLike): string {
    return textoMedidaPieza(pieza);
  }

  nombreMaterial(pieza: PieceEntryLike): string {
    if (this.resolverMaterialFn) {
      return this.resolverMaterialFn(pieza);
    }
    return resolverNombreMaterial(pieza, [], this.activosCirculantes, this.allAssets);
  }

  onAdd(): void {
    this.agregarPieza.emit();
  }

  onRemove(pieza: PieceEntryLike, indice: number): void {
    this.eliminarPieza.emit({ pieza, indice });
  }

  onTiempoChange(clave: string, horas: string | number, minutos: string | number): void {
    this.tiempoBloqueChange.emit({ clave, horas, minutos });
  }
}
