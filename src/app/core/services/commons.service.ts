import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SelectOption } from '../models/select-option';
import { firstValueFrom } from 'rxjs';
import { formatRoleDisplay } from '../utils/role-formatter.helper';
import { extractRolesArray } from './roles-permissions.service';

@Injectable({
  providedIn: 'root'
})
export class CommonsService {
  private http = inject(HttpClient);

  async getAllPositions(): Promise<Array<SelectOption>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/cargo/list`));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resp.data.map((item: any) => new SelectOption(item.id, item.descripcion));
  }

  async getAllCountries(): Promise<Array<SelectOption>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/pais/List`));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resp.data.map((item: any) => new SelectOption(item.id, item.nombre));
  }

  async getAllStates(countryId: number): Promise<Array<SelectOption>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/estado/pais/${countryId}`));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resp.map((item: any) => new SelectOption(item.id, item.nombre));
  }

  async getAllCities(stateId: number): Promise<Array<SelectOption>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/ciudad/estado/${stateId}`));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resp.map((item: any) => new SelectOption(item.id, item.nombre));
  }
  async getAllRoles(): Promise<Array<SelectOption>> {
    try {
      const resp = await firstValueFrom(this.http.get(`${environment.apiUrl}/rol/list`));
      const roles = extractRolesArray(resp);
      
      const filtered: SelectOption[] = [];
      const addedLabels = new Set<string>();

      roles.forEach((item) => {
        const rawVal = item.descripcion.trim();
        const upper = rawVal.toUpperCase();

        if (upper.includes('ADMIN') && !addedLabels.has('Administrador')) {
          filtered.push(new SelectOption(rawVal, 'Administrador'));
          addedLabels.add('Administrador');
        } else if ((upper.includes('OPERADOR') || upper.includes('REGULAR') || upper.includes('USER')) && !addedLabels.has('Operador')) {
          filtered.push(new SelectOption(rawVal, 'Operador'));
          addedLabels.add('Operador');
        } else if (rawVal && !addedLabels.has(rawVal)) {
          // Para cualquier otro rol que se agregue en la BD
          filtered.push(new SelectOption(rawVal, formatRoleDisplay(rawVal)));
          addedLabels.add(rawVal);
        }
      });

      if (filtered.length > 0) {
        return filtered;
      }
    } catch (e) {
      console.error('Error fetching roles in CommonsService:', e);
    }

    return [
      new SelectOption('ROLE_ADMINISTRADOR', 'Administrador'),
      new SelectOption('ROLE_OPERADOR', 'Operador')
    ];
  }
}
