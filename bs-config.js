module.exports = {
    files: ['./**/*.{html,css,js}'],
    server: true,
    https: {
        key: "./localhost-key.pem",
        cert: "./localhost.pem"
    },
    port: 3000,
    watch: true,
    notify: false
};
