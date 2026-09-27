// Checks a bond number against the published draws, entirely in the browser.
(function () {
  var BN = '০১২৩৪৫৬৭৮৯';
  var RANK = ['', '১ম', '২য়', '৩য়', '৪র্থ', '৫ম'];
  var data = null;
  function toLatin(s) { return s.replace(/[০-৯]/g, function (d) { return BN.indexOf(d); }).replace(/\D/g, ''); }
  function bn(s) { return String(s).replace(/\d/g, function (d) { return BN[d]; }); }
  function load() { return data ? Promise.resolve(data) : fetch('/data/results.json').then(function (r) { return r.json(); }).then(function (d) { data = d; return d; }); }
  document.querySelectorAll('.check-form').forEach(function (form) {
    var out = form.parentNode.querySelector('.check-out');
    var input = form.querySelector('input');
    input.addEventListener('input', function () { var v = toLatin(input.value).slice(0, 7); if (input.value !== v) input.value = v; });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = toLatin(input.value);
      if (n.length !== 7) { out.className = 'check-out warn'; out.textContent = '৭ অঙ্কের বন্ড নম্বর লিখুন (7 digits).'; return; }
      load().then(function (d) {
        var wins = [];
        d.draws.forEach(function (dr) { dr.prizes.forEach(function (p) { if (p.numbers.indexOf(n) >= 0) wins.push({ draw: dr.draw, date: dr.date, rank: p.rank, amount: p.amount }); }); });
        if (!wins.length) {
          out.className = 'check-out none';
          out.innerHTML = '<strong>' + bn(n) + '</strong> — শেষ ' + bn(d.draws.length) + 'টি ড্র-তে কোনো পুরস্কার নেই।<br><span class="en">No prize in the last ' + d.draws.length + ' draws.</span>';
        } else {
          out.className = 'check-out win';
          out.innerHTML = '<strong>' + bn(n) + '</strong> জিতেছে!<ul>' + wins.map(function (w) {
            return '<li>' + bn(w.draw) + 'তম ড্র: ' + RANK[w.rank] + ' পুরস্কার ৳' + w.amount.toLocaleString('en-IN') + ' (কর বাদে ৳' + Math.round(w.amount * (1 - d.taxRate)).toLocaleString('en-IN') + ')</li>';
          }).join('') + '</ul><span class="small">ড্র-এর তারিখ থেকে ' + bn(d.claimYears) + ' বছরের মধ্যে বাংলাদেশ ব্যাংক বা যেকোনো তফসিলি ব্যাংকে দাবি করুন।</span>';
        }
      }).catch(function () { out.className = 'check-out warn'; out.textContent = 'ফলাফল লোড করা যায়নি। আবার চেষ্টা করুন।'; });
    });
  });
})();
