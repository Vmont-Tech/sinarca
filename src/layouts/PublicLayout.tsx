import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function PublicLayout() {
    return (
        <div className="bg-[#050a05] min-h-screen font-sans text-white flex flex-col">
            <Header />
            
            <main className="flex-1 pt-24">
                <Outlet />
            </main>

            <Footer />
        </div>
    );
}
