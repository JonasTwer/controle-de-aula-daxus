/**
 * CONFIGURAÇÃO DO GOD MODE (ADMIN DASHBOARD V5.0)
 * 
 * Este arquivo centraliza a lista de e-mails autorizados a acessar
 * o painel administrativo exclusivo.
 */

export const ADMIN_EMAILS = ['jonas10psn@gmail.com'];

/**
 * Verifica se um e-mail tem permissão de admin
 */
export const isAdmin = (email: string | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};
