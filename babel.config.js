module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['transform-inline-environment-variables', { include: ['STRIPE_SECRET_KEY'] }],
  ],
};
