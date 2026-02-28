'use client';

import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import React, { useEffect, useState } from 'react'
import { UserDetailContext } from '@/contexts/UserDetailContext';
import { UserProvider } from '@/contexts/UserContext';
import { ModelProvider } from '@/contexts/ModelContext';
import { AdminProvider } from '@/contexts/AdminContext';
import AdminLoginModal from '@/app/_components/modals/AdminLoginModal';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function Provider({ children }) {

    const { currentUser } = useAuth();
    const [userDetail, setUserDetail] = useState();

    useEffect(() => {
        currentUser && CreateNewUser();
    }, [currentUser])

    // Extract and format user's name from email (same logic as sidebar)
    const getUserNameFromEmail = (user) => {
        if (user?.displayName) {
            const name = user.displayName;
            return name.length > 5 ? name.substring(0, 5) + '…' : name;
        }

        if (user?.email) {
            // Extract name from email (part before @)
            const emailName = user.email.split('@')[0];
            // Remove numbers, dots, underscores, and hyphens, then capitalize
            const cleanName = emailName.replace(/[0-9._-]/g, '');
            const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();

            // Truncate if longer than 5 characters
            return formattedName.length > 5 ? formattedName.substring(0, 5) + '…' : formattedName;
        }

        return 'User';
    };

    const CreateNewUser = async () => {
        // login already exists
        if (!currentUser?.email) return;

        let { data: Users, error } = await supabase
            .from('Users')
            .select('*')
            .eq('email', currentUser.email);

        // console.log(Users)

        if (Users.length == 0) {

            const { data, error } = await supabase
                .from('Users')
                .insert([
                    {
                        name: getUserNameFromEmail(currentUser),
                        email: currentUser.email
                    },
                ])
                .select()

            // console.log(data)

            setUserDetail(data[0]);
            return;

        }

        setUserDetail(Users[0]);

    }

    return (

        <UserDetailContext.Provider value={{ userDetail, setUserDetail }}>
            <UserProvider>
                <ModelProvider>
                    <AdminProvider>
                        <div>
                            {children}
                            <AdminLoginModal />
                            <ToastContainer
                                position="top-right"
                                autoClose={3000}
                                hideProgressBar={false}
                                newestOnTop={false}
                                closeOnClick
                                rtl={false}
                                pauseOnFocusLoss
                                draggable
                                pauseOnHover
                                theme="dark"
                            />
                        </div>
                    </AdminProvider>
                </ModelProvider>
            </UserProvider>
        </UserDetailContext.Provider>
    )
}

export default Provider
