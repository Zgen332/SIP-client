const path = require('path');

// webpack.config.js

module.exports = {
 mode: 'development', // или 'production'
  entry: './src/js/app.js', // Точка входа
  output: {
    filename: 'bundle.js', // Выходной файл
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
                // Убедитесь, что этот пресет установлен
                '@babel/preset-env'
            ],
            // 💡 КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: 
            // Это гарантирует, что Babel будет корректно парсить ES-модули
            plugins: [
                // Эта настройка часто необходима для корректного парсинга в Babel
                '@babel/plugin-transform-modules-commonjs'
            ]
          }
        }
      }
    ]
  }
};