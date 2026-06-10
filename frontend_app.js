"import \"@/App.css\";
import { BrowserRouter, Routes, Route } from \"react-router-dom\";
import { Toaster } from \"sonner\";
import Home from \"@/pages/Home\";
import Admin from \"@/pages/Admin\";
import Header from \"@/components/Header\";

function App() {
  return (
    <div className=\"App min-h-screen bg-[#FAFAFA] text-[#111827]\">
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path=\"/\" element={<Home />} />
          <Route path=\"/admin\" element={<Admin />} />
        </Routes>
        <Toaster position=\"top-right\" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;
"
