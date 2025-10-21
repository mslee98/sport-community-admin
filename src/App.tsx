import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from "./layout/AppLayout";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { AuthGuard } from "./components/auth/AuthGuard";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Home from "./pages/Dashboard/Home";
import { ScrollToTop } from './components/common/ScrollToTop';
import NotFound from './pages/OtherPage/NotFound';
import SignIn from './pages/AuthPages/SignIn';
import SignUp from './pages/AuthPages/SignUp';
import UserManagement from './pages/UserManagement/UserManagement';

const AppContent: React.FC = () => {
  const { theme } = useTheme();

  return (
    <>
      <ScrollToTop />
      <Routes>
            {/* Auth Routes - No Layout */}
            <Route index path="/" element={
              <AuthGuard requireAuth={false}>
                <SignIn />
              </AuthGuard>
            } />
            <Route path="/signin" element={
              <AuthGuard requireAuth={false}>
                <SignIn />
              </AuthGuard>
            } />
            <Route path="/signup" element={
              <AuthGuard requireAuth={false}>
                <SignUp />
              </AuthGuard>
            } />
            
            {/* Main App Routes - With Layout */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={
                <AuthGuard requireAuth={true}>
                  <Home />
                </AuthGuard>
              } />
              <Route path="/user-management" element={
                <AuthGuard requireAuth={true}>
                  <UserManagement />
                </AuthGuard>
              } />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
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
        theme={theme}
      />
    </>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
