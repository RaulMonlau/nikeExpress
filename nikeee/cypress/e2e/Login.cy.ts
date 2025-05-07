describe('Login', () => {
  beforeEach(() => {
    // Visitar la página principal antes de cada test
    cy.visit('/');
  });

  it('debería mostrar el formulario de login', () => {
    // Hacer clic en el botón o enlace de login
    cy.contains('Iniciar sesión').click();
    
    // Verificar que el formulario de login se muestre correctamente
    cy.get('form').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.contains('button', 'Iniciar sesión').should('be.visible');
  });

  it('debería mostrar error con credenciales incorrectas', () => {
    // Hacer clic en el botón o enlace de login
    cy.contains('Iniciar sesión').click();
    
    // Rellenar el formulario con datos incorrectos
    cy.get('input[type="email"]').type('usuario_incorrecto@example.com');
    cy.get('input[type="password"]').type('password_incorrecta');
    
    // Enviar el formulario
    cy.contains('button', 'Iniciar sesión').click();
    
    // Verificar que se muestre un mensaje de error
    cy.contains('Credenciales inválidas').should('be.visible');
  });

  it('debería iniciar sesión correctamente con credenciales válidas', () => {
    // Hacer clic en el botón o enlace de login
    cy.contains('Iniciar sesión').click();
    
    // Rellenar el formulario con credenciales válidas (ajusta estos valores según tu sistema)
    cy.get('input[type="email"]').type('castillejogarciaraull@gmail.com');
    cy.get('input[type="password"]').type('Raul_2003');
    
    // Enviar el formulario
    cy.contains('button', 'Iniciar sesión').click();
    
    // Verificar que se ha redirigido a la página principal o dashboard
    cy.url().should('include', '/home');
    
    // Verificar que estamos dentro de la aplicación (algún elemento que sea único de la página interna)
    cy.get('header').should('exist');
    
    // Verificar que aparece el nombre de usuario o mensaje de bienvenida
    // Usando una búsqueda más amplia basada en el código del header.component.html
    cy.contains('Welcome').should('exist');
  });

  it('debería permitir Logout', () => {
    // Primero iniciar sesión
    cy.contains('Iniciar sesión').click();
    cy.get('input[type="email"]').type('castillejogarciaraull@gmail.com');
    cy.get('input[type="password"]').type('Raul_2003');
    cy.contains('button', 'Iniciar sesión').click();
    
    // Esperar a que se redirija y cargue la página interna
    cy.url().should('include', '/home');
    
    // Verificar que el enlace de Logout esté visible y hacer clic en él
    // Según el header.component.html, el logout aparece directamente, no en un menú desplegable
    cy.contains('Logout').click();
    
    // Verificar que se haya cerrado la sesión correctamente
    cy.contains('Iniciar sesión').should('be.visible');
  });
});