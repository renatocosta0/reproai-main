module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    // Derives the [data-theme="dark"] twin of every colour rule (see the file header).
    "./postcss/dark-theme.js": {}
  }
};
