import React from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import Main from "./components/Main";
import { ThemeProvider } from "@emotion/react";
import { blue } from "@mui/material/colors";
import { createTheme } from "@mui/material";

function App() {
  const theme = createTheme({
    palette: {
      primary: {
        main: blue[700],
        contrastText: "#fff",
      },
    },
  });
  return (
    <div className="App">
      <ThemeProvider theme={theme}>
        <Navbar />
        <Main className="Main" />
      </ThemeProvider>
    </div>
  );
}

export default App;
