# 🍽️ Firma Yemek Menüsü — Google Apps Script Sitesi

Google E-Tablo'daki (Excel benzeri) yemek listenizi, ziyaretçilerin **tarih seçince
o günün menüsünün açıldığı**, yemeklerin yanında **gerçek fotoğrafların göründüğü** şık
bir web sitesine dönüştüren Google Apps Script projesi.

- 📅 Tarih seçici + "Bugün" butonu + ileri/geri gün okları (‹ ›)
- 📖 **Tek gün görünümü**: hangi tarihi seçerseniz yalnızca o günün listesi açılır
- 🔥 Her yemeğin yanında **kalori değeri** (yemek tipine göre, porsiyon başına yaklaşık)
- 🎨 Her yemekte şık, renkli bir **kategori ikonu** (çorba/et/pilav/tatlı…)
- 🥗 **Diyetisyen Asistan** (yandan açılır): sağlık durumu + hedefi sorar, o günün menüsünden firma kuralına uygun bir tabak önerir (kalori + protein/karbonhidrat/yağ)
- 🔎 Yemek arama (tüm günlerde)
- 📱 Telefon / tablet / bilgisayar uyumlu
- ⚡ Veriler E-Tablo'dan **canlı** çekilir — tabloyu güncellediğinizde site de güncellenir

---

## 📁 Dosyalar

| Dosya | Ne işe yarar |
|-------|--------------|
| `apps-script/Code.gs` | Sunucu tarafı: E-Tabloyu okur, menüyü ayrıştırır, kategorilere ayırır |
| `apps-script/Index.html` | Ana sayfa iskeleti |
| `apps-script/Stylesheet.html` | Tasarım (CSS) |
| `apps-script/JavaScript.html` | Arayüz davranışı (accordion, arama, görsel yedekleme) |
| `apps-script/appsscript.json` | Proje ayarları (izinler, saat dilimi, web uygulaması erişimi) |

---

## 🚀 Kurulum (adım adım)

### 1. Apps Script projesini oluşturun
İki yol var, birini seçin:

**A) E-Tabloya bağlı (kolay):** Yemek listesi E-Tablosunu açın →
`Uzantılar (Extensions) > Apps Script`.

**B) Bağımsız proje:** <https://script.google.com> → `Yeni proje`.

### 2. Dosyaları yapıştırın
Açılan editörde:
- Soldaki `Code.gs` içeriğini silip bu depodaki `apps-script/Code.gs` içeriğiyle değiştirin.
- `+` (Dosya ekle) → **HTML** ile üç dosya oluşturun ve içeriklerini yapıştırın. **İsimler tam olarak şöyle olmalı** (uzantısız yazın):
  - `Index`
  - `Stylesheet`
  - `JavaScript`
- (İsteğe bağlı) Sol üstteki ⚙️ **Proje Ayarları** → "appsscript.json manifest dosyasını göster"i açıp içeriğini `apps-script/appsscript.json` ile değiştirin.

### 3. Ayarları düzenleyin (`Code.gs` en üstü)
```js
var CONFIG = {
  SPREADSHEET_ID: '1Q66fihZXiC7uRi-HoW2LWgmpbibc4BB-6oNEeUSFSvE', // E-Tablo linkinizdeki /d/ ... /edit arası
  SHEET_NAME: '',              // Belirli bir sekme için adını yazın, ör. 'TEMMUZ 2026'. Boş = ilk sayfa.
  PAGE_TITLE: 'Temmuz Yemek Listesi',
  COMPANY_NAME: 'Firma Yemek Menüsü',
  ...
};
```
> **SPREADSHEET_ID** zaten sizin linkinizdeki değerle dolu. Farklı bir tabloya
> bağlanmak isterseniz burayı değiştirin.

### 4. Test edin
Editörde üstteki fonksiyon listesinden `buildMenuData` seçip **Çalıştır (Run)** deyin.
İlk çalıştırmada Google **izin** isteyecek → hesabınızı seçin →
"Gelişmiş > (proje adına) git" → **İzin ver**. (E-Tabloyu okuma + görsel çekme izni.)

### 5. Web uygulaması olarak yayınlayın
`Dağıt (Deploy) > Yeni dağıtım > Tür: Web uygulaması`:
- **Şu şekilde çalıştır:** Ben (`kendi hesabınız`)
- **Erişim:** Herkes / "Anyone" (firma çalışanları giriş yapmadan görebilsin)
- **Dağıt** → çıkan **Web uygulaması URL'sini** paylaşın. Bitti! 🎉

> Kodda değişiklik yaptıkça: `Dağıt > Dağıtımları yönet > (kalem ✏️) > Sürüm: Yeni` deyip
> tekrar dağıtın.

---

## 🎨 Özelleştirme

**Renkler:** `Stylesheet.html` en üstündeki `:root` bloğundaki değişkenleri değiştirin
(`--brand` ana renk, `--accent` vurgu rengi vb.).

**Başlık / firma adı:** `Code.gs > CONFIG > PAGE_TITLE` ve `COMPANY_NAME`.

**Belirli bir yemeğe kendi görselinizi koymak:** `Code.gs > CONFIG > IMAGE_OVERRIDES`:
```js
IMAGE_OVERRIDES: {
  'İSKENDER KEBAP': 'https://siteniz.com/iskender.jpg',
  'AŞURE': 'https://siteniz.com/asure.jpg'
}
```
Buraya eklemediğiniz yemekler için görsel, adına göre otomatik bulunur.

---

## 🎨 Görseller ve 🔥 kaloriler

**Görsel:** İnternetten fotoğraf çekme denendi ama alakasız sonuçlar veriyordu
(rastgele fotoğraf servisleri). Bu yüzden artık her yemekte, kategorisine göre
renkli ve şık bir **ikon** (🍲 çorba, 🍢 et, 🍚 pilav, 🥗 salata, 🍮 tatlı, 🥛 içecek…)
gösteriliyor. Temiz, hızlı ve her zaman tutarlı.

**Kalori:** Her yemeğin yanında **porsiyon başına yaklaşık** kalori değeri yazar.
Değer şöyle belirlenir:
1. `CONFIG.CALORIE_OVERRIDES` — o yemek için elle değer yazdıysan o kullanılır.
2. **Yemek adı** — yaygın yemekler için isabetli değer (ör. İskender ≈ 650, ayran ≈ 60).
3. **Kategori** — ikisi de yoksa yemek tipine göre tipik değer (çorba ≈ 120, salata ≈ 70…).

Bir yemeğin kalorisini değiştirmek istersen `CONFIG.CALORIE_OVERRIDES`'a ekle:
```js
CALORIE_OVERRIDES: {
  'İSKENDER KEBAP': 620,
  'ÇİKOLATALI SPOONFUL': 280
}
```
Kalori sütununu tümüyle kapatmak için `CONFIG.SHOW_CALORIES: false` yap.

> Not: Kalori değerleri **yaklaşık** tahminlerdir; porsiyon ve tarife göre değişir.

---

## 🥗 Diyetisyen Asistan

Sağ alttaki **🥗 Diyetisyen** butonuna basınca yandan bir sohbet paneli açılır ve
kullanıcıya sırayla sorar:

1. **Yardımcı olayım mı?** (Evet / Hayır)
2. **Sağlık durumu** (çoklu seçim): Yok · Şeker (diyabet) · Kolesterol · Tansiyon
3. **Hedef**: Zayıflama · Kilo alma · Kas yapma · Kilo koruma

Sonra **o an seçili günün menüsünden** bir tabak önerir ve her yemeğin **kalori +
protein/karbonhidrat/yağ** değerini + toplamı gösterir. Öneri firma kuralına uyar:

- **Pilav/makarna** varsa yalnızca **1 tanesi** seçilir.
- **Köfte/tavuk/et** gibi ana yemeklerden yalnızca **1 tanesi** seçilir.
- Hedefe göre ayarlanır: zayıflamada karbonhidrat azaltılır, kas yapmada yüksek
  protein öne çıkar, kilo almada porsiyon/tatlı eklenir.
- Sağlık durumuna göre uyarılır: diyabet → tatlı yok/bulgur tercih; kolesterol →
  ızgara-haşlama, kızartma yok; tansiyon → turşu/tuz uyarısı.

> Tüm mantık site içinde çalışır (ek servis/anahtar gerekmez). Değerler yaklaşıktır;
> **tıbbi tavsiye değildir**, panelde de bu not gösterilir.

---

## 📐 E-Tablo yapısı nasıl okunuyor?

Kod, tabloda **tarih başlığı** içeren hücreleri arar (ör. `1 Temmuz 2026 Çarşamba`).
Her başlığın **altındaki aynı sütun** hücreleri, bir sonraki başlığa kadar o günün
yemekleri sayılır. Böylece sizin haftalık tablonuz (Pazartesi–Cumartesi sütunları,
altlarında alt alta yemekler) otomatik olarak çözülür. Boş hücreler atlanır.

> Yani gelecekte Ağustos, Eylül... eklerseniz veya satır/sütun kaydırırsanız bile,
> tarih başlıkları `gün Ay yıl` biçiminde olduğu sürece site kendiliğinden çalışır.

---

## ❓ Sık karşılaşılan durumlar

- **"Menü yüklenemedi" / sayfa boş:** `SPREADSHEET_ID` doğru mu? Doğru sekme için
  `SHEET_NAME` gerekiyor olabilir.
- **"Tarih başlığı bulunamadı":** Başlık hücreleri `1 Temmuz 2026 Çarşamba` gibi
  metin olmalı. (Salt tarih hücreleri de desteklenir.)
- **Değişiklik siteye yansımadı:** 30 dk'lık önbellek olabilir; `CONFIG.CACHE_MINUTES`
  değerini `0` yapıp test edebilir ya da yeni sürüm dağıtabilirsiniz.
