const generateOTP = () => {
  const otpVal = Math.floor(Math.random() * 1000000);
  return otpVal.toString().padStart(6, '0');
};

export default generateOTP;
