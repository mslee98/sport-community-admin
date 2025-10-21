import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from "./layout/AppLayout";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { AuthGuard } from "./components/auth/AuthGuard";

import Home from "./pages/Dashboard/Home";
import { ScrollToTop } from './components/common/ScrollToTop';
import NotFound from './pages/OtherPage/NotFound';
import SignIn from './pages/AuthPages/SignIn';
import SignUp from './pages/AuthPages/SignUp';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
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
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
