describe('Login Test', () => {
  
  beforeEach(() => {
    // Expo Web ডিফল্টভাবে 8081 পোর্টে চলে
    cy.visit('http://localhost:8081');
  });

  it('allows user to login', () => {
    // ১. ইমেইল ইনপুট চেক করা এবং টাইপ করা
   cy.get('[data-testid="email_input"]')
  .should('be.visible')
  .click() // আগে ক্লিক করে ফোকাস নিন
  .type('anikshowmick@gmail.com', { delay: 100 });

    // ২. পাসওয়ার্ড টাইপ করা
    cy.get('[data-testid="password_input"]')
      .should('be.visible')
      .type('12345678');

    // ৩. লগইন বাটনে ক্লিক করা
    cy.get('[data-testid="login_button"]')
      .should('be.visible')
      .click();
      
    // ৪. (অপশনাল) লগইন হওয়ার পর কোনো টেক্সট বা এলিমেন্ট চেক করা
    // cy.contains('Home').should('be.visible');
  });

});