import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Rol } from '../models/rol';

export function extractRolesArray(res: unknown): Rol[] {
  console.log('Roles raw response from backend:', res);
  if (!res) return [];
  let candidate: unknown = res;

  // Si viene envuelto en objeto { data: ... } o { roles: ... } o { result: ... }
  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    const obj = candidate as Record<string, unknown>;
    if (obj['data'] !== undefined) {
      candidate = obj['data'];
    } else if (obj['roles'] !== undefined) {
      candidate = obj['roles'];
    } else if (obj['result'] !== undefined) {
      candidate = obj['result'];
    }

    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const inner = candidate as Record<string, unknown>;
      if (inner['roles'] !== undefined) {
        candidate = inner['roles'];
      } else if (inner['data'] !== undefined) {
        candidate = inner['data'];
      }
    }
  }

  // Si candidate es un objeto asociativo de PHP (ej: { "0": {...}, "1": {...} } o { "1": {...}, "2": {...} })
  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    const values = Object.values(candidate);
    if (values.length > 0 && typeof values[0] === 'object') {
      candidate = values;
    }
  }

  // Desempaquetar arrays anidados de cualquier profundidad (ej: [[...]] o [[[...]]])
  while (Array.isArray(candidate) && candidate.length > 0 && Array.isArray(candidate[0])) {
    candidate = candidate[0];
  }

  if (!Array.isArray(candidate)) {
    return [];
  }

  const results: Rol[] = [];

  for (const item of candidate) {
    if (!item) continue;

    // Caso: array de strings ['ROLE_ADMINISTRADOR', 'ROLE_OPERADOR']
    if (typeof item === 'string') {
      const desc = item.trim();
      if (desc) {
        results.push({
          id: undefined,
          descripcion: desc,
          idStatus: 1,
          idempresa: 1
        });
      }
      continue;
    }

    if (typeof item === 'object') {
      const rec = item as Record<string, unknown>;

      // Buscar id en múltiples variantes
      const rawId = rec['id'] ?? 
                    rec['Id'] ?? 
                    rec['ID'] ?? 
                    rec['id_rol'] ?? 
                    rec['rol_id'] ?? 
                    rec['idRol'] ?? 
                    (typeof rec['rol'] === 'object' && rec['rol'] ? (rec['rol'] as Record<string, unknown>)['id'] : undefined);
      const id = rawId !== undefined && rawId !== null && !isNaN(Number(rawId)) ? Number(rawId) : undefined;

      // Buscar descripción en múltiples variantes (case insensitive / Doctrine / campos comunes)
      let desc = '';
      const possibleDescKeys = [
        'descripcion', 'Descripcion', 'DESCRIPCION',
        'rol', 'Rol', 'ROL',
        'nombre', 'Nombre', 'NOMBRE',
        'name', 'description', 'role'
      ];
      for (const k of possibleDescKeys) {
        if (rec[k] && typeof rec[k] === 'string' && (rec[k] as string).trim()) {
          desc = (rec[k] as string).trim();
          break;
        }
      }

      // Si aún no se encuentra descripción, verificar si viene anidado (ej. rec['rol'] es un objeto con descripción)
      if (!desc && rec['rol'] && typeof rec['rol'] === 'object') {
        const nestedRol = rec['rol'] as Record<string, unknown>;
        for (const k of possibleDescKeys) {
          if (nestedRol[k] && typeof nestedRol[k] === 'string' && (nestedRol[k] as string).trim()) {
            desc = (nestedRol[k] as string).trim();
            break;
          }
        }
      }

      const idStatus = Number(rec['idStatus'] ?? rec['id_status_id'] ?? rec['statusId'] ?? rec['id_status']) || 1;
      const idempresa = Number(rec['idempresa'] ?? rec['idempresa_id'] ?? rec['id_empresa']) || 1;

      if (desc) {
        results.push({
          id,
          descripcion: desc,
          idStatus,
          idempresa
        });
      }
    }
  }

  console.log('Roles extracted array result:', results);
  return results;
}

@Injectable({
  providedIn: 'root'
})
export class RolesPermissionsService {
  private http = inject(HttpClient);

  // Mocks fallback
  private getMockRoles(): Rol[] {
    const stored = localStorage.getItem('cost_roles');
    if (stored) {
      return JSON.parse(stored);
    }
    const initial: Rol[] = [
      { id: 1, descripcion: 'ROLE_ADMINISTRADOR', statusId: 1 },
      { id: 2, descripcion: 'ROLE_OPERADOR', statusId: 1 }
    ];
    localStorage.setItem('cost_roles', JSON.stringify(initial));
    return initial;
  }

  getRoles(): Observable<Rol[]> {
    if (environment.useMocks) {
      return of(this.getMockRoles());
    }

    // El backend Symfony define únicamente GET /rol/list
    return this.http.get<unknown>(`${environment.apiUrl}/rol/list`).pipe(
      map(res => extractRolesArray(res)),
      catchError(err => {
        console.error('Error al cargar /rol/list:', err);
        return of([]);
      })
    );
  }

  createRole(role: Rol): Observable<Rol> {
    if (environment.useMocks) {
      const roles = this.getMockRoles();
      const newId = roles.length > 0 ? Math.max(...roles.map(r => r.id || 0)) + 1 : 1;
      const newRole = { ...role, id: newId };
      roles.push(newRole);
      localStorage.setItem('cost_roles', JSON.stringify(roles));
      return of(newRole);
    }
    // Excluir 'id' del body para que Symfony no intente llamar al método inexistente setId()
    const { id, ...payload } = role;
    return this.http.post<Rol>(`${environment.apiUrl}/rol`, payload);
  }

  updateRole(id: number, role: Rol): Observable<Rol> {
    if (environment.useMocks) {
      const roles = this.getMockRoles();
      const index = roles.findIndex(r => r.id === id);
      if (index !== -1) {
        roles[index] = { ...role, id };
        localStorage.setItem('cost_roles', JSON.stringify(roles));
        return of(roles[index]);
      }
      return of(role);
    }
    // En Symfony PUT /rol/{id}, la entidad se obtiene por la URL, se excluye 'id' del body
    const { id: _, ...payload } = role;
    return this.http.put<Rol>(`${environment.apiUrl}/rol/${id}`, payload);
  }

  deleteRole(id: number): Observable<void> {
    if (environment.useMocks) {
      let roles = this.getMockRoles();
      roles = roles.filter(r => r.id !== id);
      localStorage.setItem('cost_roles', JSON.stringify(roles));
      return of(undefined);
    }
    return this.http.delete<void>(`${environment.apiUrl}/rol/${id}`);
  }
}
