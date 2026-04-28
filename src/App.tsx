import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Editor from "./pages/Editor";

/**
 * Root router. The marketing page lives at `/`, the editor at `/editor`.
 * Everything else 404s into the home page — there's nothing else to find here.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
