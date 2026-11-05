import { FormGroup } from '@angular/forms';
import Swal from 'sweetalert2';

/**
 * Valida un formulario reactivo. Si es inválido:
 * 1. Marca todos los controles como touched para que los estilos `.is-invalid` se pinten en rojo.
 * 2. Muestra un popup SweetAlert advirtiendo que faltan campos por llenar.
 * 3. Al presionar "Entendido" (OK), hace scroll suave al primer campo en rojo y le da foco.
 *
 * Retorna `true` si el formulario es válido, o `false` si faltan campos obligatorios.
 */
export function validarCamposObligatorios(
  form: FormGroup,
  mensajeCustom?: string
): boolean {
  if (form.valid) {
    return true;
  }

  // 1. Pintar todos los campos obligatorios en rojo de inmediato
  form.markAllAsTouched();

  // 2. Mostrar popup de aviso claro
  Swal.fire({
    icon: 'warning',
    title: 'Campos obligatorios requeridos',
    text: mensajeCustom || 'Por favor completa los campos marcados en rojo para poder continuar.',
    confirmButtonText: 'Entendido',
    confirmButtonColor: '#4680ff',
    customClass: {
      popup: 'rounded-4'
    }
  }).then(() => {
    // 3. Al presionar OK, hacer scroll suave al primer campo inválido y enfocarlo
    setTimeout(() => {
      const primerInvalido = document.querySelector(
        '.is-invalid, .ng-invalid:not(form):not(.ng-untouched), input.is-invalid, select.is-invalid, textarea.is-invalid, ng-select.is-invalid'
      ) as HTMLElement | null;

      if (primerInvalido) {
        primerInvalido.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (primerInvalido.tagName.toLowerCase() === 'ng-select') {
          const inputInterno = primerInvalido.querySelector('input') as HTMLInputElement | null;
          inputInterno?.focus();
        } else {
          primerInvalido.focus?.();
        }
      }
    }, 100);
  });

  return false;
}
