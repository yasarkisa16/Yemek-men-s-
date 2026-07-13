/**
 * ===========================================================================
 *  FİRMA YEMEK MENÜSÜ - Google Apps Script Web App
 * ---------------------------------------------------------------------------
 *  Veri kaynağı : Google E-Tablo (Temmuz yemek listesi)
 *  Ne yapar     : E-Tablodaki haftalık menüyü okuyup, ziyaretçinin tarih
 *                 seçince menünün aşağı doğru açıldığı (accordion) şık bir
 *                 web sitesi olarak sunar. Yemeklerin yanında görsel gösterir.
 *
 *  KURULUM: Aşağıdaki CONFIG bölümünü kendine göre düzenle, sonra
 *           "Dağıt (Deploy) > Yeni dağıtım > Web uygulaması" ile yayınla.
 *           Detaylı adımlar için README.md dosyasına bak.
 * ===========================================================================
 */

/** -------------------------- AYARLAR (CONFIG) ---------------------------- */
var CONFIG = {
  // E-Tablonun kimliği (linkteki /d/ ... /edit arasındaki kısım)
  SPREADSHEET_ID: '1Q66fihZXiC7uRi-HoW2LWgmpbibc4BB-6oNEeUSFSvE',

  // Hangi sayfa (sekme) okunacak? Boş bırakılırsa ilk sayfa kullanılır.
  // Örn: 'TEMMUZ 2026'
  SHEET_NAME: '',

  // Sitenin başlığı
  PAGE_TITLE: 'Temmuz Yemek Listesi',

  // Üstte görünen firma / alt başlık
  COMPANY_NAME: 'Valeo',

  // Menü verisi kaç dakika önbellekte tutulsun? (hız için). 0 = kapalı.
  CACHE_MINUTES: 30,

  // Belirli bir yemek için kendi görselini kullanmak istersen buraya ekle.
  // Anahtar = E-Tablodaki yemek adı (büyük/küçük harf önemsiz).
  // Örn: 'İSKENDER KEBAP': 'https://ornek.com/iskender.jpg'
  IMAGE_OVERRIDES: {
    // 'İSKENDER KEBAP': 'https://.../iskender.jpg',
  },

  // Saat dilimi (Bugün butonu için)
  TIME_ZONE: 'Europe/Istanbul'
};

/** Türkçe ay adları -> ay numarası */
var TR_MONTHS = {
  'ocak': 1, 'şubat': 2, 'mart': 3, 'nisan': 4, 'mayıs': 5, 'haziran': 6,
  'temmuz': 7, 'ağustos': 8, 'eylül': 9, 'ekim': 10, 'kasım': 11, 'aralık': 12
};

/** -------------------------- WEB UYGULAMASI ----------------------------- */

/** Sayfa açıldığında çağrılır */
function doGet() {
  var t = HtmlService.createTemplateFromFile('Index');
  return t.evaluate()
    .setTitle(CONFIG.PAGE_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** HTML dosyalarını birbirine dahil etmek için yardımcı */
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/**
 * İstemciye (tarayıcıya) gönderilen ana veri.
 * google.script.run.getMenuData() ile çağrılır.
 */
function getMenuData() {
  var data;
  var cache = null;
  var key = 'menu_v3_' + CONFIG.SPREADSHEET_ID + '_' + (CONFIG.SHEET_NAME || 'first');

  if (CONFIG.CACHE_MINUTES > 0) {
    try {
      cache = CacheService.getScriptCache();
      var hit = cache.get(key);
      if (hit) data = JSON.parse(hit);
    } catch (e) { /* önbellek yoksa devam */ }
  }

  if (!data) {
    data = buildMenuData();
    if (cache) {
      try { cache.put(key, JSON.stringify(data), CONFIG.CACHE_MINUTES * 60); } catch (e) {}
    }
  }

  // "Bugün" her zaman güncel olmalı (önbellekten bağımsız)
  data.today = Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'yyyy-MM-dd');
  return data;
}

/** -------------------------- VERİ AYRIŞTIRMA ---------------------------- */

/**
 * E-Tabloyu okuyup menü verisini oluşturur.
 * Yapı: Tarih başlığı içeren hücreler bulunur (ör. "1 Temmuz 2026 Çarşamba").
 * Her başlığın ALTINDAKİ aynı sütun hücreleri, bir sonraki başlık satırına
 * kadar o günün yemekleri olarak toplanır. Böylece haftalık grid düzeni
 * (Pzt–Cmt sütunları, alt alta yemekler) otomatik çözülür.
 */
function buildMenuData() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = CONFIG.SHEET_NAME ? ss.getSheetByName(CONFIG.SHEET_NAME) : ss.getSheets()[0];
  if (!sheet) {
    throw new Error('Sayfa bulunamadı: "' + CONFIG.SHEET_NAME + '". CONFIG.SHEET_NAME değerini kontrol et.');
  }

  var values = sheet.getDataRange().getValues();
  var numRows = values.length;
  var numCols = numRows ? values[0].length : 0;

  // 1) Tarih başlığı olan hücreleri bul
  var headers = [];               // {row, col, dateStr, date(iso), day, month, monthName, year, weekday}
  var headerRows = {};            // hangi satırlar başlık satırı
  for (var r = 0; r < numRows; r++) {
    for (var c = 0; c < numCols; c++) {
      var parsed = parseTurkishDate(values[r][c]);
      if (parsed) {
        parsed.row = r;
        parsed.col = c;
        headers.push(parsed);
        headerRows[r] = true;
      }
    }
  }

  // 2) Her başlık için altındaki yemekleri topla
  var days = [];
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    var dishes = [];
    for (var rr = h.row + 1; rr < numRows; rr++) {
      if (headerRows[rr]) break;                 // sonraki hafta başlığına geldik -> dur
      var cell = values[rr][h.col];
      var name = (cell === null || cell === undefined) ? '' : String(cell).trim();
      if (name) dishes.push(makeDish(name));
    }
    days.push({
      dateStr: h.dateStr,
      iso: h.date,
      day: h.day,
      month: h.month,
      year: h.year,
      weekday: h.weekday || weekdayFromIso(h.date),
      label: h.day + ' ' + capitalizeTr(h.monthName),
      dishCount: dishes.length,
      dishes: dishes
    });
  }

  // 3) Tarihe göre sırala
  days.sort(function (a, b) { return a.iso < b.iso ? -1 : (a.iso > b.iso ? 1 : 0); });

  return {
    title: CONFIG.PAGE_TITLE,
    company: CONFIG.COMPANY_NAME,
    days: days,
    generatedAt: Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'dd.MM.yyyy HH:mm')
  };
}

/**
 * "1 Temmuz 2026 Çarşamba" gibi bir metni ayrıştırır.
 * Eşleşmezse null döner (yani o hücre tarih başlığı değildir).
 */
function parseTurkishDate(value) {
  if (value === null || value === undefined) return null;

  // Hücre gerçek bir tarih (Date) ise
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    var d = value;
    return {
      dateStr: Utilities.formatDate(d, CONFIG.TIME_ZONE, 'd MMMM yyyy', ),
      date: Utilities.formatDate(d, CONFIG.TIME_ZONE, 'yyyy-MM-dd'),
      day: d.getDate(),
      month: d.getMonth() + 1,
      monthName: monthNameTr(d.getMonth() + 1),
      year: d.getFullYear(),
      weekday: ''
    };
  }

  var s = String(value).trim();
  if (!s) return null;

  // "1 Temmuz 2026 Çarşamba"  /  "01 Temmuz 2026"
  var m = s.match(/^(\d{1,2})[.\s]+([A-Za-zÇĞİıİÖŞÜçğıiöşü]+)[.\s]+(\d{4})(?:\s+(.+))?$/);
  if (!m) return null;

  var monthNum = TR_MONTHS[trLower(m[2])];
  if (!monthNum) return null;

  var day = parseInt(m[1], 10);
  var year = parseInt(m[3], 10);
  if (day < 1 || day > 31) return null;

  return {
    dateStr: s,
    date: year + '-' + pad2(monthNum) + '-' + pad2(day),
    day: day,
    month: monthNum,
    monthName: m[2],
    year: year,
    weekday: (m[4] || '').trim()
  };
}

/** -------------------------- YEMEK + GÖRSEL ----------------------------- */

/** Bir yemek adından tam yemek nesnesi üretir */
function makeDish(name) {
  var cat = categorize(name);
  return {
    name: name,
    pretty: toTitleTr(name),
    category: cat.label,
    emoji: cat.emoji,
    imageUrl: imageFor(name, cat.tag)
  };
}

/** Yemek adına göre görsel URL'si üretir */
function imageFor(name, tag) {
  var ov = CONFIG.IMAGE_OVERRIDES || {};
  if (ov[name]) return ov[name];
  var norm = trLower(name);
  for (var k in ov) { if (trLower(k) === norm) return ov[k]; }

  // loremflickr: anahtar kelimeye göre gerçek fotoğraf getirir, API anahtarı istemez.
  // ?lock=N => aynı yemek her zaman aynı fotoğrafı gösterir (rastgele değişmez).
  var lock = (hashCode(norm) % 1000) + 1;
  return 'https://loremflickr.com/320/240/' + encodeURIComponent(tag) + '?lock=' + lock;
}

/**
 * Yemek adını kategoriye ayırır (görsel anahtar kelimesi + emoji için).
 * İlk eşleşen kural kazanır, o yüzden sıralama önemlidir.
 */
function categorize(name) {
  var n = trLower(name);
  var rules = [
    { any: ['çorba', 'corba'],                                  tag: 'soup',      emoji: '🍲', label: 'Çorba' },
    { any: ['ayran', 'cacık', 'cacik', 'kefir', 'şıra', 'sira'], tag: 'ayran',     emoji: '🥛', label: 'İçecek' },
    { any: ['yoğurt', 'yogurt'],                                tag: 'yogurt',    emoji: '🥣', label: 'Yoğurt' },
    { any: ['turşu', 'tursu'],                                  tag: 'pickles',   emoji: '🥒', label: 'Turşu' },
    { any: ['salata', 'söğüş', 'sogus', 'söğüs'],               tag: 'salad',     emoji: '🥗', label: 'Salata' },
    { any: ['humus', 'haydari', 'ezme', 'meze', 'közlenmiş'],   tag: 'hummus',    emoji: '🫓', label: 'Meze' },
    { any: ['börek', 'borek', 'poğaça', 'pogaca', 'pide', 'gözleme', 'gozleme', 'açma', 'acma'],
                                                                tag: 'pastry',    emoji: '🥟', label: 'Hamur İşi' },
    { any: ['pilav', 'bulgur', 'şehriye', 'sehriye'],           tag: 'rice',      emoji: '🍚', label: 'Pilav' },
    { any: ['makarna', 'erişte', 'eriste', 'spagetti', 'mantı', 'manti'],
                                                                tag: 'pasta',     emoji: '🍝', label: 'Makarna' },
    { any: ['helva', 'aşure', 'asure', 'sütlaç', 'sutlac', 'baklava', 'kadayıf', 'kadayif',
            'revani', 'kazandibi', 'güllaç', 'gullac', 'muhallebi', 'puding', 'tatlı', 'tatli',
            'spoonful', 'kek', 'kurabiye', 'irmik', 'trileçe', 'trilece', 'profiterol'],
                                                                tag: 'dessert',   emoji: '🍮', label: 'Tatlı' },
    { any: ['kebap', 'köfte', 'kofte', 'iskender', 'döner', 'doner', 'biftek', 'saç', 'sac kavurma',
            'tavuk', 'et ', 'etli', 'musakka', 'güveç', 'guvec', 'sote', 'schnitzel', 'şinitzel',
            'kanat', 'but', 'bonfile', 'pirzola', 'kavurma', 'tas kebabı'],
                                                                tag: 'kebab',     emoji: '🍢', label: 'Ana Yemek (Et)' },
    { any: ['nohut', 'fasulye', 'bamya', 'türlü', 'turlu', 'sebze', 'semizotu', 'ıspanak', 'ispanak',
            'dolma', 'sarma', 'mücver', 'mucver', 'pırasa', 'pirasa', 'kabak', 'patates', 'bezelye',
            'enginar', 'karnabahar', 'brokoli', 'imam', 'zeytinyağlı', 'zeytinyagli', 'herse', 'keşkek', 'keskek'],
                                                                tag: 'vegetable', emoji: '🥘', label: 'Sebze Yemeği' },
    { any: ['ekmek', 'lavaş', 'lavas', 'bazlama'],              tag: 'bread',     emoji: '🍞', label: 'Ekmek' }
  ];

  for (var i = 0; i < rules.length; i++) {
    var r = rules[i];
    for (var j = 0; j < r.any.length; j++) {
      if (n.indexOf(r.any[j]) !== -1) {
        return { tag: r.tag, emoji: r.emoji, label: r.label };
      }
    }
  }
  return { tag: 'turkish-food', emoji: '🍽️', label: 'Yemek' };
}

/** ------------------------------ YARDIMCILAR ---------------------------- */

function pad2(n) { return (n < 10 ? '0' : '') + n; }

/** Türkçe uyumlu küçük harf (İ->i, I->ı) */
function trLower(s) {
  return String(s).replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

/** Türkçe uyumlu ilk harf büyütme */
function trUpperFirst(ch) {
  if (ch === 'i') return 'İ';
  if (ch === 'ı') return 'I';
  return ch.toUpperCase();
}

/** "EZOGELİN ÇORBA" -> "Ezogelin Çorba" (Türkçe uyumlu) */
function toTitleTr(s) {
  return trLower(s).split(/(\s+)/).map(function (w) {
    if (!w.trim()) return w;
    return trUpperFirst(w.charAt(0)) + w.slice(1);
  }).join('');
}

function capitalizeTr(s) {
  if (!s) return s;
  return trUpperFirst(trLower(s).charAt(0)) + trLower(s).slice(1);
}

function monthNameTr(m) {
  var names = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return names[m - 1] || '';
}

function weekdayFromIso(iso) {
  var p = iso.split('-');
  var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  var days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  return days[d.getDay()];
}

/** Basit deterministik hash (görsel kilidi için) */
function hashCode(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
