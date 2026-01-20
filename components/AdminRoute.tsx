import React, { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { isAdmin } from '../utils/adminConfig';

interface AdminRouteProps {
    children: React.ReactNode;
    onAccessDenied: () => void;
}

/**
 * GUARDIÃO DO GOD MODE
 * 
 * Componente de proteção que verifica se o usuário logado
 * tem permissão de acesso ao Admin Dashboard.
 * 
 * Se o e-mail NÃO estiver na lista autorizada, chama
 * onAccessDenied para voltar ao dashboard.
 */
const AdminRoute: React.FC<AdminRouteProps> = ({ children, onAccessDenied }) => {
    useEffect(() => {
        const checkAdminAccess = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                console.warn('🚫 [ADMIN ROUTE] Usuário não autenticado. Redirecionando...');
                onAccessDenied();
                return;
            }

            const userEmail = session.user.email;

            if (!isAdmin(userEmail)) {
                console.warn(`🚫 [ADMIN ROUTE] Acesso negado para: ${userEmail}`);
                console.warn('   → E-mail não autorizado. Redirecionando para Dashboard...');
                onAccessDenied();
                return;
            }

            console.log(`✅ [ADMIN ROUTE] Acesso autorizado: ${userEmail}`);
        };

        checkAdminAccess();
    }, [onAccessDenied]);

    return <>{children}</>;
};

export default AdminRoute;
