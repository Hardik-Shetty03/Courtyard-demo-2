const { createClient } = require('@supabase/supabase-js');

const url = 'https://eczgkigjvcsvjfzfcnqv.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjemdraWdqdmNzdmpmemZjbnF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NjQzNzgsImV4cCI6MjEwMDM0MDM3OH0.YVNrG1pzSwwmcjkaK3Y9_IBQXa6koCevxksNxMSaDTI';

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('court_tabs').select('*');
  if (error) {
    console.error('Error fetching court_tabs:', error);
    return;
  }

  console.log('Total court_tabs rows:', data.length);
  const counts = {};
  data.forEach(t => {
    counts[t.booking_id] = (counts[t.booking_id] || 0) + 1;
  });

  console.log('Booking ID row counts:');
  Object.keys(counts).forEach(bid => {
    if (counts[bid] > 1) {
      console.log(`❌ Duplicate booking_id: ${bid} appears ${counts[bid]} times!`);
    } else {
      console.log(`✅ Unique booking_id: ${bid} appears ${counts[bid]} time.`);
    }
  });
}

check();
