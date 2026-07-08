import { ref, watch, onMounted } from 'vue';

const isDark = ref(true); // Default to true based on user preference

export function useTheme() {
  const toggleTheme = () => {
    isDark.value = !isDark.value;
  };

  onMounted(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      isDark.value = savedTheme === 'dark';
    } else {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Set initial theme attribute
    document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light');
  });

  watch(isDark, (newValue) => {
    const themeStr = newValue ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', themeStr);
    localStorage.setItem('theme', themeStr);
  });

  return {
    isDark,
    toggleTheme
  };
}
