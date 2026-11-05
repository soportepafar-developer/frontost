import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Rol } from '../../../../core/models/rol';
import { RolesPermissionsService } from '../../../../core/services/roles-permissions.service';
import Swal from 'sweetalert2';
import { ComponentCanDeactivate } from '../../../../core/guards/pending-changes.guard';
import { validarCamposObligatorios } from '../../../../core/utils/form-validation.helper';
import { formatRoleDisplay, formatRoleForDb } from '../../../../core/utils/role-formatter.helper';

@Component({
  selector: 'app-add-role',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-role.component.html'
})
export class AddRoleComponent implements OnInit, ComponentCanDeactivate {
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private rolesService = inject(RolesPermissionsService);

  form!: FormGroup;
  id: number = 0;
  loading = false;
  submitted = false;

  constructor() {
    this.myFormValues();
  }

  get f() { return this.form.controls; }

  get previewRoleDb(): string {
    return formatRoleForDb(this.f['description']?.value || '');
  }

  ngOnInit(): void {
    this.setValues();
  }

  myFormValues() {
    this.form = this.formBuilder.group({
      description: ['', Validators.required]
    });
  }

  setValues() {
    const stored = localStorage.getItem('security_edit_role');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data) {
          const rawDesc = data.descripcion || data.Descripcion || data.rol || data.Rol || data.nombre || data.name || '';
          if (rawDesc) {
            this.f['description'].setValue(formatRoleDisplay(rawDesc));
          }
          const rawId = data.id ?? data.Id ?? data.ID ?? data.id_rol ?? data.rol_id ?? data.idRol;
          if (rawId !== undefined && rawId !== null && !isNaN(Number(rawId)) && Number(rawId) > 0) {
            this.id = Number(rawId);
          }
        }
      } catch (err) {
        console.error('Error al recuperar rol para editar:', err);
      }
    }
  }

  onSubmit() {
    this.submitted = true;
    if (!validarCamposObligatorios(this.form)) {
      return;
    }

    this.loading = true;

    const rol: Rol = {
      descripcion: formatRoleForDb(this.f['description'].value),
      idStatus: 1,
      idempresa: 1
    };
    if (this.id > 0) {
      rol.id = this.id;
    }

    const request = this.id === 0 
      ? this.rolesService.createRole(rol)
      : this.rolesService.updateRole(this.id, rol);

    request.subscribe({
      next: () => {
        localStorage.removeItem('security_edit_role');
        this.loading = false;
        this.submitted = true;
        this.form?.markAsPristine();
        Swal.fire({
          title: '¡Guardado!',
          text: 'Rol guardado exitosamente.',
          icon: 'success',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#4680ff'
        }).then(() => {
          this.router.navigate(['/roles']);
        });
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: (error: any) => {
        this.loading = false;
        if (error.status == 409) {
          Swal.fire('Error', error.error?.msg || 'Conflicto al guardar el rol.', 'error');
        } else {
          Swal.fire('Error', 'Ha ocurrido un error al guardar el rol. Intente más tarde.', 'error');
        }
      }
    });
  }

  canDeactivate(): boolean {
    if (this.submitted && !this.loading) {
      return true;
    }
    return !this.form?.dirty;
  }

  back() {
    localStorage.removeItem('security_edit_role');
    this.router.navigate(['/roles']);
  }
}
