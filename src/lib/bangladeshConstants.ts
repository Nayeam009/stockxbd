// Bangladeshi LPG Business Constants

export const BANGLADESHI_CURRENCY_SYMBOL = '৳';
export const BANGLADESHI_PHONE_PREFIX = '+880';

// Bangladesh Divisions and Districts
export const DIVISIONS = [
  'Dhaka',
  'Chittagong',
  'Rajshahi',
  'Khulna',
  'Sylhet',
  'Barishal',
  'Rangpur',
  'Mymensingh'
];

export const DISTRICTS_BY_DIVISION: Record<string, string[]> = {
  'Dhaka': ['Dhaka', 'Gazipur', 'Narayanganj', 'Tangail', 'Manikganj', 'Munshiganj', 'Narsingdi', 'Faridpur', 'Gopalganj', 'Kishoreganj', 'Madaripur', 'Rajbari', 'Shariatpur'],
  'Chittagong': ['Chittagong', 'Comilla', 'Brahmanbaria', 'Chandpur', 'Lakshmipur', 'Noakhali', 'Feni', 'Khagrachhari', 'Rangamati', 'Bandarban', "Cox's Bazar"],
  'Rajshahi': ['Rajshahi', 'Bogra', 'Joypurhat', 'Naogaon', 'Natore', 'Nawabganj', 'Pabna', 'Sirajganj'],
  'Khulna': ['Khulna', 'Jessore', 'Satkhira', 'Bagerhat', 'Narail', 'Magura', 'Jhenaidah', 'Chuadanga', 'Kushtia', 'Meherpur'],
  'Sylhet': ['Sylhet', 'Moulvibazar', 'Habiganj', 'Sunamganj'],
  'Barishal': ['Barishal', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur', 'Barguna'],
  'Rangpur': ['Rangpur', 'Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Thakurgaon'],
  'Mymensingh': ['Mymensingh', 'Jamalpur', 'Netrokona', 'Sherpur']
};

export const THANAS_BY_DISTRICT: Record<string, string[]> = {
  'Dhaka': ['Dhanmondi', 'Gulshan', 'Uttara', 'Mirpur', 'Mohammadpur', 'Motijheel', 'Ramna', 'Tejgaon', 'Banani', 'Badda', 'Khilgaon', 'Pallabi', 'Kafrul', 'Cantonment', 'Demra', 'Jatrabari', 'Kadamtali', 'Kamrangirchar', 'Kotwali', 'Lalbagh', 'Shahbagh', 'Sutrapur', 'Wari'],
  'Gazipur': ['Gazipur Sadar', 'Kaliakair', 'Kaliganj', 'Kapasia', 'Sreepur'],
  'Narayanganj': ['Narayanganj Sadar', 'Araihazar', 'Bandar', 'Rupganj', 'Sonargaon'],
  'Chittagong': ['Kotwali', 'Pahartali', 'Panchlaish', 'Khulshi', 'Bakalia', 'Double Mooring', 'Halishahar', 'Bayazid', 'Chandgaon', 'Bandar', 'EPZ', 'Patenga', 'Agrabad'],
  'Sylhet': ['Kotwali', 'South Surma', 'Airport', 'Jalalabad', 'Moglabazar', 'Shah Poran', 'Osmani Nagar'],
  'Rajshahi': ['Boalia', 'Rajpara', 'Motihar', 'Shah Makhdum', 'Katakhali'],
  'Khulna': ['Kotwali', 'Sonadanga', 'Khalishpur', 'Daulatpur', 'Khan Jahan Ali'],
  'Comilla': ['Comilla Sadar', 'Comilla Adarsha Sadar', 'Brahmanpara', 'Burichang', 'Chandina', 'Chauddagram', 'Daudkandi', 'Debidwar', 'Homna', 'Laksam', 'Muradnagar', 'Nangalkot', 'Titas']
};

export const getDistricts = (division: string): string[] => {
  return DISTRICTS_BY_DIVISION[division] || [];
};

export const getThanas = (district: string): string[] => {
  return THANAS_BY_DISTRICT[district] || [];
};

export const BANGLADESHI_NAMES = {
  male: [
    'Abdul Rahman', 'Mohammad Karim', 'Rafiq Ahmed', 'Shahid Islam', 'Nasir Uddin',
    'Aminul Haque', 'Jahangir Alam', 'Mizanur Rahman', 'Habibur Rahman', 'Golam Mostafa',
    'Shamsul Haque', 'Mofizul Islam', 'Anwar Hossain', 'Badrul Alam', 'Fazlul Karim'
  ],
  female: [
    'Rashida Begum', 'Fatema Khatun', 'Rokeya Sultana', 'Rahima Begum', 'Salma Khatun',
    'Nasreen Akter', 'Kulsum Begum', 'Rahela Khatun', 'Marium Begum', 'Hosne Ara'
  ]
};

export const BANGLADESHI_LOCATIONS = [
  'Dhanmondi, Dhaka', 'Gulshan, Dhaka', 'Uttara, Dhaka', 'Mirpur, Dhaka', 'Old Dhaka',
  'Wari, Dhaka', 'Tejgaon, Dhaka', 'Motijheel, Dhaka', 'Ramna, Dhaka', 'Pallabi, Dhaka',
  'Agrabad, Chittagong', 'Nasirabad, Chittagong', 'Halishahar, Chittagong', 'Panchlaish, Chittagong',
  'Zindabazar, Sylhet', 'Ambarkhana, Sylhet', 'Tilagarh, Sylhet',
  'Shaheb Bazar, Rajshahi', 'Boalia, Rajshahi', 'Motihar, Rajshahi',
  'Kazla, Rajshahi', 'Court Para, Kushtia', 'Sadar, Kushtia'
];

export const BANGLADESHI_PAYMENT_METHODS = [
  { id: 'cash', name: 'Cash', color: 'bg-accent/10 text-accent border-accent/20' },
  { id: 'bkash', name: 'bKash', color: 'bg-pink-100 text-pink-600 border-pink-200' },
  { id: 'nagad', name: 'Nagad', color: 'bg-orange-100 text-orange-600 border-orange-200' },
  { id: 'rocket', name: 'Rocket', color: 'bg-purple-100 text-purple-600 border-purple-200' },
  { id: 'bank', name: 'Bank Transfer', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  { id: 'credit', name: 'Credit', color: 'bg-yellow-100 text-yellow-600 border-yellow-200' }
];

export const BANGLADESHI_LPG_PRODUCTS = [
  { id: '5kg', name: '5kg LPG Cylinder', category: 'cylinder', standardPrice: 850 },
  { id: '12kg', name: '12kg LPG Cylinder', category: 'cylinder', standardPrice: 1200 },
  { id: '35kg', name: '35kg Commercial Cylinder', category: 'cylinder', standardPrice: 3200 },
  { id: '2burner', name: '2 Burner Gas Stove', category: 'stove', standardPrice: 4500 },
  { id: '3burner', name: '3 Burner Gas Stove', category: 'stove', standardPrice: 6500 },
  { id: '4burner', name: '4 Burner Gas Stove', category: 'stove', standardPrice: 8500 },
  { id: 'regulator', name: 'Gas Regulator', category: 'accessory', standardPrice: 450 },
  { id: 'pipe', name: 'Gas Pipe', category: 'accessory', standardPrice: 350 }
];

export const getRandomBangladeshiName = () => {
  const isMale = Math.random() > 0.3;
  const names = isMale ? BANGLADESHI_NAMES.male : BANGLADESHI_NAMES.female;
  return names[Math.floor(Math.random() * names.length)];
};

export const getRandomBangladeshiLocation = () => {
  return BANGLADESHI_LOCATIONS[Math.floor(Math.random() * BANGLADESHI_LOCATIONS.length)];
};

export const getRandomBangladeshiPhone = () => {
  const prefixes = ['017', '019', '018', '016', '015', '013'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `+880 ${prefix}${number.substring(0, 4)} ${number.substring(4)}`;
};

export const getRandomPaymentMethod = () => {
  return BANGLADESHI_PAYMENT_METHODS[Math.floor(Math.random() * BANGLADESHI_PAYMENT_METHODS.length)];
};