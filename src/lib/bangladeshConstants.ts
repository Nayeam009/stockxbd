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

// Complete Thanas/Upazilas for all 64 Districts
export const THANAS_BY_DISTRICT: Record<string, string[]> = {
  // Dhaka Division
  'Dhaka': ['Dhanmondi', 'Gulshan', 'Uttara', 'Mirpur', 'Mohammadpur', 'Motijheel', 'Ramna', 'Tejgaon', 'Banani', 'Badda', 'Khilgaon', 'Pallabi', 'Kafrul', 'Cantonment', 'Demra', 'Jatrabari', 'Kadamtali', 'Kamrangirchar', 'Kotwali', 'Lalbagh', 'Shahbagh', 'Sutrapur', 'Wari', 'Hazaribagh', 'Shyampur', 'Turag', 'Sabujbagh', 'Rampura', 'Bhashantek', 'Dakshinkhan', 'Khilkhet', 'Vatara'],
  'Gazipur': ['Gazipur Sadar', 'Kaliakair', 'Kaliganj', 'Kapasia', 'Sreepur', 'Tongi'],
  'Narayanganj': ['Narayanganj Sadar', 'Araihazar', 'Bandar', 'Rupganj', 'Sonargaon', 'Fatullah', 'Siddhirganj'],
  'Tangail': ['Tangail Sadar', 'Basail', 'Bhuapur', 'Delduar', 'Ghatail', 'Gopalpur', 'Kalihati', 'Madhupur', 'Mirzapur', 'Nagarpur', 'Sakhipur', 'Dhanbari'],
  'Manikganj': ['Manikganj Sadar', 'Daulatpur', 'Ghior', 'Harirampur', 'Saturia', 'Shivalaya', 'Singair'],
  'Munshiganj': ['Munshiganj Sadar', 'Gazaria', 'Lohajang', 'Sirajdikhan', 'Sreenagar', 'Tongibari'],
  'Narsingdi': ['Narsingdi Sadar', 'Belabo', 'Monohardi', 'Palash', 'Raipura', 'Shibpur'],
  'Faridpur': ['Faridpur Sadar', 'Alfadanga', 'Bhanga', 'Boalmari', 'Charbhadrasan', 'Madhukhali', 'Nagarkanda', 'Sadarpur', 'Saltha'],
  'Gopalganj': ['Gopalganj Sadar', 'Kashiani', 'Kotalipara', 'Muksudpur', 'Tungipara'],
  'Kishoreganj': ['Kishoreganj Sadar', 'Austagram', 'Bajitpur', 'Bhairab', 'Hossainpur', 'Itna', 'Karimganj', 'Katiadi', 'Kuliarchar', 'Mithamain', 'Nikli', 'Pakundia', 'Tarail'],
  'Madaripur': ['Madaripur Sadar', 'Kalkini', 'Rajoir', 'Shibchar'],
  'Rajbari': ['Rajbari Sadar', 'Baliakandi', 'Goalanda', 'Kalukhali', 'Pangsha'],
  'Shariatpur': ['Shariatpur Sadar', 'Bhedarganj', 'Damudya', 'Gosairhat', 'Naria', 'Zajira'],

  // Chittagong Division
  'Chittagong': ['Kotwali', 'Pahartali', 'Panchlaish', 'Khulshi', 'Bakalia', 'Double Mooring', 'Halishahar', 'Bayazid', 'Chandgaon', 'Bandar', 'EPZ', 'Patenga', 'Agrabad', 'Karnaphuli', 'Anwara', 'Banshkhali', 'Boalkhali', 'Chandanaish', 'Fatikchhari', 'Hathazari', 'Lohagara', 'Mirsharai', 'Patiya', 'Rangunia', 'Raozan', 'Sandwip', 'Satkania', 'Sitakunda'],
  'Comilla': ['Comilla Sadar', 'Comilla Adarsha Sadar', 'Barura', 'Brahmanpara', 'Burichang', 'Chandina', 'Chauddagram', 'Daudkandi', 'Debidwar', 'Homna', 'Laksam', 'Muradnagar', 'Nangalkot', 'Titas', 'Meghna', 'Monohargonj'],
  'Brahmanbaria': ['Brahmanbaria Sadar', 'Akhaura', 'Ashuganj', 'Bancharampur', 'Bijoynagar', 'Kasba', 'Nabinagar', 'Nasirnagar', 'Sarail'],
  'Chandpur': ['Chandpur Sadar', 'Faridganj', 'Haimchar', 'Haziganj', 'Kachua', 'Matlab Dakshin', 'Matlab Uttar', 'Shahrasti'],
  'Lakshmipur': ['Lakshmipur Sadar', 'Raipur', 'Ramganj', 'Ramgati', 'Kamalnagar'],
  'Noakhali': ['Noakhali Sadar', 'Begumganj', 'Chatkhil', 'Companiganj', 'Hatiya', 'Senbagh', 'Sonaimuri', 'Subarnachar', 'Kabirhat'],
  'Feni': ['Feni Sadar', 'Chhagalnaiya', 'Daganbhuiyan', 'Parshuram', 'Fulgazi', 'Sonagazi'],
  'Khagrachhari': ['Khagrachhari Sadar', 'Dighinala', 'Lakshmichhari', 'Mahalchhari', 'Manikchhari', 'Matiranga', 'Panchhari', 'Ramgarh'],
  'Rangamati': ['Rangamati Sadar', 'Bagaichhari', 'Barkal', 'Belaichhari', 'Juraichhari', 'Kaptai', 'Kawkhali', 'Langadu', 'Naniarchar', 'Rajasthali'],
  'Bandarban': ['Bandarban Sadar', 'Alikadam', 'Lama', 'Naikhongchhari', 'Rowangchhari', 'Ruma', 'Thanchi'],
  "Cox's Bazar": ["Cox's Bazar Sadar", 'Chakaria', 'Kutubdia', 'Maheshkhali', 'Pekua', 'Ramu', 'Teknaf', 'Ukhia'],

  // Rajshahi Division
  'Rajshahi': ['Boalia', 'Rajpara', 'Motihar', 'Shah Makhdum', 'Katakhali', 'Bagha', 'Bagmara', 'Charghat', 'Durgapur', 'Godagari', 'Mohanpur', 'Paba', 'Puthia', 'Tanore'],
  'Bogra': ['Bogra Sadar', 'Adamdighi', 'Dhunat', 'Dhupchanchia', 'Gabtali', 'Kahaloo', 'Nandigram', 'Sariakandi', 'Shajahanpur', 'Sherpur', 'Shibganj', 'Sonatala'],
  'Joypurhat': ['Joypurhat Sadar', 'Akkelpur', 'Kalai', 'Khetlal', 'Panchbibi'],
  'Naogaon': ['Naogaon Sadar', 'Atrai', 'Badalgachhi', 'Dhamoirhat', 'Manda', 'Mahadebpur', 'Niamatpur', 'Patnitala', 'Porsha', 'Raninagar', 'Sapahar'],
  'Natore': ['Natore Sadar', 'Bagatipara', 'Baraigram', 'Gurudaspur', 'Lalpur', 'Singra', 'Naldanga'],
  'Nawabganj': ['Nawabganj Sadar', 'Bholahat', 'Gomastapur', 'Nachole', 'Shibganj'],
  'Pabna': ['Pabna Sadar', 'Atgharia', 'Bera', 'Bhangura', 'Chatmohar', 'Faridpur', 'Ishwardi', 'Santhia', 'Sujanagar'],
  'Sirajganj': ['Sirajganj Sadar', 'Belkuchi', 'Chauhali', 'Kamarkhanda', 'Kazipur', 'Raiganj', 'Shahjadpur', 'Tarash', 'Ullahpara'],

  // Khulna Division
  'Khulna': ['Kotwali', 'Sonadanga', 'Khalishpur', 'Daulatpur', 'Khan Jahan Ali', 'Batiaghata', 'Dacope', 'Dighalia', 'Dumuria', 'Koyra', 'Paikgachha', 'Phultala', 'Rupsha', 'Terokhada'],
  'Jessore': ['Jessore Sadar', 'Abhaynagar', 'Bagherpara', 'Chaugachha', 'Jhikargachha', 'Keshabpur', 'Manirampur', 'Sharsha'],
  'Satkhira': ['Satkhira Sadar', 'Assasuni', 'Debhata', 'Kalaroa', 'Kaliganj', 'Shyamnagar', 'Tala'],
  'Bagerhat': ['Bagerhat Sadar', 'Chitalmari', 'Fakirhat', 'Kachua', 'Mollahat', 'Mongla', 'Morrelganj', 'Rampal', 'Sarankhola'],
  'Narail': ['Narail Sadar', 'Kalia', 'Lohagara'],
  'Magura': ['Magura Sadar', 'Mohammadpur', 'Shalikha', 'Sreepur'],
  'Jhenaidah': ['Jhenaidah Sadar', 'Harinakunda', 'Kaliganj', 'Kotchandpur', 'Maheshpur', 'Shailkupa'],
  'Chuadanga': ['Chuadanga Sadar', 'Alamdanga', 'Damurhuda', 'Jibannagar'],
  'Kushtia': ['Kushtia Sadar', 'Bheramara', 'Daulatpur', 'Khoksa', 'Kumarkhali', 'Mirpur'],
  'Meherpur': ['Meherpur Sadar', 'Gangni', 'Mujibnagar'],

  // Sylhet Division
  'Sylhet': ['Kotwali', 'South Surma', 'Airport', 'Jalalabad', 'Moglabazar', 'Shah Poran', 'Osmani Nagar', 'Balaganj', 'Beanibazar', 'Bishwanath', 'Companiganj', 'Fenchuganj', 'Golapganj', 'Gowainghat', 'Jointapur', 'Kanaighat', 'Zakiganj', 'Dakshin Surma'],
  'Moulvibazar': ['Moulvibazar Sadar', 'Barlekha', 'Juri', 'Kamalganj', 'Kulaura', 'Rajnagar', 'Sreemangal'],
  'Habiganj': ['Habiganj Sadar', 'Ajmiriganj', 'Bahubal', 'Baniachong', 'Chunarughat', 'Lakhai', 'Madhabpur', 'Nabiganj', 'Shayestaganj'],
  'Sunamganj': ['Sunamganj Sadar', 'Bishwambarpur', 'Chhatak', 'Derai', 'Dharampasha', 'Dowarabazar', 'Jagannathpur', 'Jamalganj', 'Sullah', 'Tahirpur', 'Dakshin Sunamganj'],

  // Barishal Division
  'Barishal': ['Kotwali', 'Agailjhara', 'Babuganj', 'Bakerganj', 'Banaripara', 'Gaurnadi', 'Hizla', 'Mehendiganj', 'Muladi', 'Wazirpur'],
  'Bhola': ['Bhola Sadar', 'Borhanuddin', 'Charfasson', 'Daulatkhan', 'Lalmohan', 'Manpura', 'Tazumuddin'],
  'Jhalokati': ['Jhalokati Sadar', 'Kathalia', 'Nalchity', 'Rajapur'],
  'Patuakhali': ['Patuakhali Sadar', 'Bauphal', 'Dashmina', 'Dumki', 'Galachipa', 'Kalapara', 'Mirzaganj', 'Rangabali'],
  'Pirojpur': ['Pirojpur Sadar', 'Bhandaria', 'Kawkhali', 'Mathbaria', 'Nazirpur', 'Nesarabad', 'Zianagar'],
  'Barguna': ['Barguna Sadar', 'Amtali', 'Bamna', 'Betagi', 'Patharghata', 'Taltali'],

  // Rangpur Division
  'Rangpur': ['Rangpur Sadar', 'Badarganj', 'Gangachara', 'Kaunia', 'Mithapukur', 'Pirgachha', 'Pirganj', 'Taraganj'],
  'Dinajpur': ['Dinajpur Sadar', 'Birampur', 'Birganj', 'Biral', 'Bochaganj', 'Chirirbandar', 'Fulbari', 'Ghoraghat', 'Hakimpur', 'Kaharole', 'Khansama', 'Nawabganj', 'Parbatipur'],
  'Gaibandha': ['Gaibandha Sadar', 'Fulchhari', 'Gobindaganj', 'Palashbari', 'Sadullapur', 'Saghata', 'Sundarganj'],
  'Kurigram': ['Kurigram Sadar', 'Bhurungamari', 'Char Rajibpur', 'Chilmari', 'Nageshwari', 'Phulbari', 'Rajarhat', 'Raumari', 'Ulipur'],
  'Lalmonirhat': ['Lalmonirhat Sadar', 'Aditmari', 'Hatibandha', 'Kaliganj', 'Patgram'],
  'Nilphamari': ['Nilphamari Sadar', 'Dimla', 'Domar', 'Jaldhaka', 'Kishoreganj', 'Saidpur'],
  'Panchagarh': ['Panchagarh Sadar', 'Atwari', 'Boda', 'Debiganj', 'Tetulia'],
  'Thakurgaon': ['Thakurgaon Sadar', 'Baliadangi', 'Haripur', 'Pirganj', 'Ranisankail'],

  // Mymensingh Division
  'Mymensingh': ['Mymensingh Sadar', 'Bhaluka', 'Dhobaura', 'Fulbaria', 'Gaffargaon', 'Gauripur', 'Haluaghat', 'Ishwarganj', 'Muktagachha', 'Nandail', 'Phulpur', 'Trishal', 'Tarakanda'],
  'Jamalpur': ['Jamalpur Sadar', 'Bakshiganj', 'Dewanganj', 'Islampur', 'Madarganj', 'Melandaha', 'Sarishabari'],
  'Netrokona': ['Netrokona Sadar', 'Atpara', 'Barhatta', 'Durgapur', 'Kalmakanda', 'Kendua', 'Khaliajuri', 'Madan', 'Mohanganj', 'Purbadhala'],
  'Sherpur': ['Sherpur Sadar', 'Jhenaigati', 'Nakla', 'Nalitabari', 'Sreebardi']
};

// Location types for search
export interface LocationItem {
  type: 'division' | 'district' | 'thana';
  name: string;
  division: string;
  district?: string;
  displayName: string;
}

// Get division by district name
export const getDivisionByDistrict = (district: string): string => {
  for (const [division, districts] of Object.entries(DISTRICTS_BY_DIVISION)) {
    if (districts.includes(district)) return division;
  }
  return '';
};

// Get all locations for search autocomplete
export const getAllLocations = (): LocationItem[] => {
  const locations: LocationItem[] = [];
  
  // Add all Divisions
  DIVISIONS.forEach(division => {
    locations.push({ 
      type: 'division', 
      name: division, 
      division, 
      displayName: division 
    });
  });
  
  // Add all Districts with parent Division
  Object.entries(DISTRICTS_BY_DIVISION).forEach(([division, districts]) => {
    districts.forEach(district => {
      locations.push({ 
        type: 'district', 
        name: district, 
        division,
        displayName: `${district}, ${division}` 
      });
    });
  });
  
  // Add all Thanas with parent District + Division
  Object.entries(THANAS_BY_DISTRICT).forEach(([district, thanas]) => {
    const division = getDivisionByDistrict(district);
    thanas.forEach(thana => {
      locations.push({ 
        type: 'thana', 
        name: thana, 
        district,
        division,
        displayName: `${thana}, ${district}` 
      });
    });
  });
  
  return locations;
};

// Popular locations for quick access
export const POPULAR_LOCATIONS = [
  'Gulshan',
  'Uttara',
  'Mirpur',
  'Dhanmondi',
  'Agrabad',
  'Banani',
  'Motijheel'
];

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
