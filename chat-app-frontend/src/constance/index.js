export const THEMES = [
    "retro",
    "dark",
    "cupcake",
    "luxury",
    'halloween',
    "cyberpunk",
    "synthwave",
    'emerald',
    "corporate",
    "aqua",
    "night",
    "dim",
    "abyss",
    "dracula",
    "black ",
    "valentine"

];
export function formatMessageTime(date) {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  export const handleDownload = async (url, fileName = "photo.png") => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName; // kako želiš da se zove fajl
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Failed to download image", err);
    }
  };

  import { useEffect, useState } from 'react';

  export function useDebounce(value, delay = 1200) {
    const [debouncedValue, setDebouncedValue] = useState(value);
  
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
  
      return () => clearTimeout(timer);
    }, [value, delay]);
  
    return debouncedValue;
  }



