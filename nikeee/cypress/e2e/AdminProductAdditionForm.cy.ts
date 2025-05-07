describe('Formulario de Administración de Productos', () => {
  beforeEach(() => {
    // Iniciar sesión como administrador antes de cada prueba
    cy.visit('/');
    cy.contains('Iniciar sesión').click();
    cy.get('input[type="email"]').type('castillejogarciaraull@gmail.com'); 
    cy.get('input[type="password"]').type('Raul_2003');
    cy.contains('button', 'Iniciar sesión').click();
    
    // Navegar a la página de administración
    cy.visit('/admin');
  });

  it('debería mostrar el formulario de administración de productos', () => {
    // Verificar que el formulario se muestre correctamente
    cy.contains('h2', 'Administración de Productos').should('be.visible');
    cy.get('form.product-form').should('be.visible');
    cy.get('input#reference').should('be.visible');
    cy.get('input#name').should('be.visible');
    cy.get('input#price').should('be.visible');
    cy.get('input#stock').should('be.visible');
    cy.get('textarea#description').should('be.visible');
    cy.get('select#productType').should('be.visible');
    cy.get('input#offer').should('be.visible');
    cy.get('input#productImage').should('be.visible');
  });

  it('debería mostrar errores de validación en campos requeridos', () => {
    // Intentar enviar el formulario sin rellenar campos requeridos
    cy.contains('button', 'Agregar Producto').click();
    
    // Verificar mensajes de error
    cy.contains('Referencia es obligatoria').should('be.visible');
    cy.contains('Nombre es obligatorio').should('be.visible');
    cy.contains('Precio es obligatorio').should('be.visible');
  });

  it('debería permitir agregar un nuevo producto', () => {
    // Generar una referencia única más corta
    const randomId = Math.floor(Math.random() * 9000) + 1000; // Número de 4 dígitos
    const uniqueRef = `R${randomId}`;
    
    // Rellenar el formulario
    cy.get('input#reference').type(uniqueRef);
    cy.get('input#name').type('Producto de Prueba');
    cy.get('input#price').type('99.99');
    cy.get('input#stock').type('10');
    cy.get('textarea#description').type('Descripción de prueba');
    cy.get('select#productType').select('calzado');
    cy.get('input#offer').check();
    
    // Enviar el formulario
    cy.contains('button', 'Agregar Producto').click();
    
    // Verificar éxito
    cy.contains('¡Producto agregado con éxito!').should('be.visible');
    
    // Verificar que el formulario se haya reseteado
    cy.get('input#reference').should('have.value', '');
  });

  it('debería buscar y cargar un producto existente por referencia', () => {
    // Generar una referencia única más corta
    const randomId = Math.floor(Math.random() * 9000) + 1000;
    const uniqueRef = `R${randomId}`;
    
    // Primero, agregar un producto
    cy.get('input#reference').type(uniqueRef);
    cy.get('input#name').type('Producto para Editar');
    cy.get('input#price').type('129.99');
    cy.get('input#stock').type('5');
    cy.get('select#productType').select('ropa');
    cy.contains('button', 'Agregar Producto').click();
    
    // Esperar a que se complete y se muestre mensaje de éxito
    cy.contains('¡Producto agregado con éxito!').should('be.visible');
    
    // Limpiar los campos
    cy.get('input#reference').clear();
    cy.get('input#name').clear();
    cy.get('input#price').clear();
    cy.get('input#stock').clear();
    
    // Ahora buscar el producto por referencia
    cy.get('input#reference').type(uniqueRef);
    cy.get('input#reference').blur();
    
    // Verificar que los datos se han cargado
    cy.get('input#name').should('have.value', 'Producto para Editar');
    cy.get('input#price').should('have.value', '129.99');
    cy.get('input#stock').should('have.value', '5');
    cy.get('select#productType').should('have.value', 'ropa');
    
    // Verificar que el botón de actualizar está visible
    cy.contains('button', 'Actualizar Producto').should('be.visible');
  });

  it('debería actualizar un producto existente', () => {
    // Generar una referencia única más corta
    const randomId = Math.floor(Math.random() * 9000) + 1000;
    const uniqueRef = `R${randomId}`;
    
    // Primero, agregar un producto para luego actualizarlo
    cy.get('input#reference').type(uniqueRef);
    cy.get('input#name').type('Producto Original');
    cy.get('input#price').type('99.99');
    cy.get('input#stock').type('10');
    cy.get('select#productType').select('calzado');
    cy.contains('button', 'Agregar Producto').click();
    
    // Esperar a que se complete
    cy.contains('¡Producto agregado con éxito!').should('be.visible');
    
    // Limpiar los campos
    cy.get('input#reference').clear();
    cy.get('input#name').clear();
    cy.get('input#price').clear();
    cy.get('input#stock').clear();
    
    // Buscar el producto por referencia
    cy.get('input#reference').type(uniqueRef);
    cy.get('input#reference').blur();
    
    // Esperar a que se carguen datos
    cy.wait(1000);
    
    // Modificar algunos datos
    cy.get('input#name').clear().type('Producto Actualizado');
    cy.get('input#price').clear().type('149.99');
    
    // Enviar el formulario para actualizar
    cy.contains('button', 'Actualizar Producto').click();
    
    // Verificar éxito
    cy.contains('¡Producto actualizado con éxito!').should('be.visible');
  });

  

});