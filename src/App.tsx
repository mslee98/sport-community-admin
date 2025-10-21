import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from "./layout/AppLayout";
import { ThemeProvider } from "./context/ThemeContext";

import Home from "./pages/Dashboard/Home";
import { ScrollToTop } from './components/common/ScrollToTop';
import NotFound from './pages/OtherPage/NotFound';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ScrollToTop />
        <Routes>
          <Route element={<AppLayout />}>
            <Route index path="/" element={<Home />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
