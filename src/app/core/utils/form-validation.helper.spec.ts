import { FormControl, FormGroup, Validators } from '@angular/forms';
import { validarCamposObligatorios } from './form-validation.helper';
import Swal from 'sweetalert2';

describe('form-validation.helper', () => {
  let form: FormGroup;

  beforeEach(() => {
    form = new FormGroup({
      nombre: new FormControl('', Validators.required),
      descripcion: new FormControl('', Validators.required),
      opcional: new FormControl('')
    });
  });

  it('should return true and not fire Swal when form is valid', () => {
    spyOn(Swal, 'fire');
    form.patchValue({
      nombre: 'Pieza A',
      descripcion: 'Detalle'
    });

    const resultado = validarCamposObligatorios(form);
    expect(resultado).toBeTrue();
    expect(Swal.fire).not.toHaveBeenCalled();
  });

  it('should return false, mark controls as touched and trigger Swal warning when form is invalid', () => {
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    const resultado = validarCamposObligatorios(form);

    expect(resultado).toBeFalse();
    expect(form.get('nombre')?.touched).toBeTrue();
    expect(form.get('descripcion')?.touched).toBeTrue();
    expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
      icon: 'warning',
      title: 'Campos obligatorios requeridos'
    }));
  });
});
