import { createContext, useContext } from "react";

export const MotionContext = createContext({ disabled: false });

export const useMotionPreferences = () => useContext(MotionContext);
