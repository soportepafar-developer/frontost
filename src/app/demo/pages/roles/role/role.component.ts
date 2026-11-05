import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Rol } from '../../../../core/models/rol';
import { RolesPermissionsService } from '../../../../core/services/roles-permissions.service';
import Swal from 'sweetalert2';
import { formatRoleDisplay } from '../../../../core/utils/role-formatter.helper';

@Component({
  selector: 'app-role',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './role.component.html'
})
export class RoleComponent implements OnInit {
  private rolesService = inject(RolesPermissionsService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  allRoles: Rol[] = [];
  filteredRoles: Rol[] = [];
  paginatedRoles: Rol[] = [];

  Math = Math;
  selectedRow: Rol | null = null;
  searchTerm = '';

  // Sorting
  sortColumn = 'descripcion';
  sortAscending = true;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  totalPagesArray: number[] = [];

  ngOnInit(): void {
    this.getRoles();
  }

  getRoles() {
    this.loading = true;
    this.rolesService.getRoles().subscribe({
      next: (data) => {
        this.loading = false;
        this.allRoles = data || [];
        this.filteredRoles = [...this.allRoles];
        this.applyFilterAndPagination();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error al cargar roles:', err);
        this.cdr.detectChanges();
      }
    });
  }

  onSearchChange() {
    this.currentPage = 1; // reset to first page on search
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
    if (this.sortColumn === column) {
      return this.sortAscending ? 'ti-arrow-up' : 'ti-arrow-down';
    }
    return 'ti-arrows-sort text-muted opacity-50';
  }

  getRoleFriendlyName(descripcion: string): string {
    return formatRoleDisplay(descripcion);
  }

  applyFilterAndPagination() {
    const query = this.searchTerm.toLowerCase().trim();
    if (!query) {
      this.filteredRoles = [...this.allRoles];
    } else {
      this.filteredRoles = this.allRoles.filter(r => {
        const raw = (r.descripcion || '').toLowerCase();
        const friendly = formatRoleDisplay(r.descripcion || '').toLowerCase();
        return raw.includes(query) || friendly.includes(query);
      });
    }

    // Ordenamiento
    this.filteredRoles.sort((a, b) => {
      let valA = a[this.sortColumn as keyof Rol];
      let valB = b[this.sortColumn as keyof Rol];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA === undefined || valA === null) return this.sortAscending ? 1 : -1;
      if (valB === undefined || valB === null) return this.sortAscending ? -1 : 1;

      if (valA < valB) return this.sortAscending ? -1 : 1;
      if (valA > valB) return this.sortAscending ? 1 : -1;
      return 0;
    });

    // Paginación
    this.totalPages = Math.ceil(this.filteredRoles.length / this.pageSize) || 1;
    this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedRoles = this.filteredRoles.slice(startIndex, startIndex + this.pageSize);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.applyFilterAndPagination();
    }
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.applyFilterAndPagination();
  }

  openAdd() {
    localStorage.removeItem('security_edit_role');
    this.router.navigate(['/roles/add-role']);
  }

  onEdit(row: Rol) {
    // Almacenamos el rol en localStorage para la vista de edición
    localStorage.setItem('security_edit_role', JSON.stringify(row));
    this.router.navigate(['/roles/add-role']);
  }

  onDelete(id: number, descripcion: string) {
    const friendly = this.getRoleFriendlyName(descripcion);
    Swal.fire({
      title: '¿Eliminar Rol?',
      text: `¿Estás seguro de que deseas eliminar el rol "${friendly}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.rolesService.deleteRole(id).subscribe({
          next: () => {
            Swal.fire('¡Eliminado!', 'El rol ha sido eliminado.', 'success');
            this.getRoles();
          },
          error: () => {
            Swal.fire('Error', 'No se pudo eliminar el rol.', 'error');
          }
        });
      }
    });
  }
}
