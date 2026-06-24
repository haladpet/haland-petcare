
---

# BLUEPRINT.md — HALAND PETCARE (PRODUCTION READY — SUMBER KEBENARAN MUTLAK)

## 1. VISI & PRINSIP PRODUK

Haland PetCare adalah Clinic Operating System yang menjamin operasional klinik hewan tetap 100% berjalan tanpa internet, dengan integritas data finansial dan medis yang tidak bisa dikompromikan oleh konflik sinkronisasi atau race condition.

Prinsip mutlak:
- Local First, Cloud Second — PGlite adalah source of truth operasional harian; Supabase Postgres adalah source of truth autentikasi dan backup/replikasi.
- Offline Always Works — semua fungsi klinis inti (pendaftaran, antrian, pemeriksaan, resep, rawat inap, kasir) berjalan tanpa koneksi.
- No Silent Data Loss — tidak ada last-write-wins; setiap konflik harus terlihat dan diselesaikan secara sadar.
- No Single Point of Failure — kegagalan jaringan, kegagalan satu device, atau kegagalan parsial transaksi tidak boleh merusak integritas data.
- Complete Audit Trail — setiap mutasi data dan setiap keputusan otorisasi tercatat, tidak bisa dihapus oleh role apa pun selain prosedur retensi resmi.
- Role-Based Access Control dengan Defense in Depth — keputusan otorisasi divalidasi ulang di server, client-side check hanya untuk UX.
- Performance as a Feature — navigasi antar halaman dan operasi tulis data harus terasa instan; loading penuh halaman adalah kegagalan desain, bukan hal yang dapat diterima.

---

## 2. ARSITEKTUR SISTEM TINGKAT TINGGI

### 2.1 Lapisan Sistem
- Lapisan Presentasi: Next.js App Router, render campuran Server Components (untuk halaman statis/berat data awal) dan Client Components (untuk interaktivitas real-time, form, dan state lokal).
- Lapisan State Client: Zustand untuk state global (sesi, status online/offline, status sinkronisasi); state lokal komponen untuk UI sementara.
- Lapisan Data Lokal: PGlite sebagai database PostgreSQL penuh yang berjalan di browser, diakses lewat ORM yang sama dengan server untuk konsistensi tipe.
- Lapisan Data Server: Supabase PostgreSQL sebagai source of truth autentikasi, backup, dan titik replikasi multi-device/multi-lokasi.
- Lapisan Sinkronisasi: mesin antrian sinkron searah dua arah (push perubahan lokal ke server, pull perubahan server ke lokal) dengan deteksi konflik berbasis versi, bukan timestamp semata.
- Lapisan Keamanan: autentikasi berbasis JWT bertingkat (access token pendek, refresh token panjang), RBAC tervalidasi di server, Row Level Security di database server sebagai lapisan isolasi tenant terakhir.
- Lapisan Observability: audit log, sync log, error log terpisah secara fungsi namun saling berelasi melalui record_id dan device_id.

### 2.2 Batas Tanggung Jawab Tiap Lapisan
- Client tidak pernah menjadi otoritas akhir untuk keputusan izin akses — hanya otoritas untuk pengalaman pengguna.
- Server tidak pernah menjadi satu-satunya jalur operasional — sistem harus tetap fungsional penuh tanpa server yang dapat dijangkau.
- Database lokal tidak pernah menyimpan kredensial rahasia (kata sandi, secret kunci enkripsi) — hanya data operasional dan identitas non-sensitif.
- Database server adalah satu-satunya tempat verifikasi kata sandi dan satu-satunya tempat penegakan isolasi data antar klinik di tingkat baris data.

### 2.3 Lingkungan Multi-Tenant
- Satu instalasi sistem dapat melayani banyak klinik (clinic_id sebagai pemisah).
- Tidak ada data yang boleh terlihat lintas klinik dalam kondisi apa pun, termasuk melalui bug, query yang lupa filter, maupun melalui akun yang berpindah klinik.
- Pemisahan ini ditegakkan dua kali: di level aplikasi (filter wajib di setiap query) dan di level database (kebijakan keamanan baris).

---

## 3. ENTITAS DATA & RELASI (TANPA KODE, DEFINISI KONSEPTUAL)

### 3.1 Domain Identitas & Akses
- Entitas Pengguna Server: representasi identitas dengan kredensial, terhubung ke satu klinik, memiliki satu peran.
- Entitas Pengguna Lokal: salinan identitas tanpa kredensial, untuk keperluan tampilan dan referensi relasi di database lokal.
- Entitas Klinik: unit organisasi tertinggi, pemilik tunggal data di bawahnya.
- Entitas Perangkat: representasi satu device fisik yang terdaftar untuk satu klinik, memiliki identitas kriptografis yang ditandatangani server agar tidak dapat dipalsukan dari sisi client.
- Entitas Sesi: representasi satu login aktif pada satu perangkat, memiliki masa berlaku dan masa tidak aktif maksimum.

### 3.2 Domain Pelanggan & Hewan
- Entitas Pelanggan: pemilik hewan, dapat memiliki akun login sendiri (peran pelanggan) atau tidak.
- Entitas Hewan: terhubung ke satu pelanggan, menyimpan profil biologis dan riwayat alergi/kondisi.

### 3.3 Domain Operasional Harian
- Entitas Antrian: representasi kehadiran satu pelanggan-hewan pada satu hari, dengan nomor urut unik per klinik per hari, prioritas, dan status alur.
- Entitas Jadwal Temu: representasi rencana kedatangan di masa depan, terpisah dari antrian aktual hari kedatangan.

### 3.4 Domain Klinis
- Entitas Rekam Medis: satu kejadian pemeriksaan, menyimpan temuan klinis dan terhubung opsional ke satu entri antrian.
- Entitas Resep: satu set instruksi pengobatan terhubung ke satu rekam medis.
- Entitas Item Resep: baris detail obat dalam satu resep, terhubung ke entitas Obat.
- Entitas Obat: katalog item farmasi dengan informasi stok agregat.

### 3.5 Domain Rawat Inap
- Entitas Kandang: unit fisik rawat inap dengan status ketersediaan.
- Entitas Rawat Inap: satu episode inap, terhubung ke satu rekam medis, satu hewan, satu kandang.
- Entitas Riwayat Tarif Rawat Inap: rekaman setiap periode tarif berbeda yang berlaku selama satu episode rawat inap — tidak boleh ada tarif tunggal statis pada entitas Rawat Inap itu sendiri.
- Entitas Monitoring Rawat Inap: rekaman periodik kondisi pasien selama dirawat.

### 3.6 Domain Inventaris
- Entitas Item Inventaris: representasi agregat satu jenis barang, menyimpan kuantitas total dan ambang pemesanan ulang.
- Entitas Batch Inventaris: representasi satu kedatangan stok dengan tanggal kedaluwarsa dan kuantitas tersisa, untuk keperluan rotasi stok berbasis kedaluwarsa terdekat.
- Entitas Transaksi Inventaris: jejak setiap pergerakan stok masuk/keluar/penyesuaian, selalu terhubung ke alasan/rujukan transaksi.

### 3.7 Domain Finansial
- Entitas Faktur: dokumen penagihan terhubung ke satu pelanggan, dapat berasal dari kunjungan rawat jalan atau rawat inap.
- Entitas Item Faktur: baris detail layanan/obat/prosedur dalam satu faktur.
- Entitas Pembayaran: rekaman penerimaan dana terhadap satu faktur, dapat berupa pembayaran penuh atau sebagian.

### 3.8 Domain Audit & Sinkronisasi

- Entitas Log Audit: jejak setiap mutasi data dan setiap keputusan otorisasi, tidak dapat diubah setelah ditulis.
- Entitas Antrian Sinkronisasi: representasi setiap perubahan lokal yang belum terkonfirmasi tersinkron ke server, menyimpan versi skema saat perubahan dibuat.
- Entitas Antrian Konflik: representasi setiap perubahan yang terdeteksi bertentangan antara versi lokal dan versi server, menunggu keputusan sadar dari pengguna berwenang.
- Entitas Log Sinkronisasi: rekaman ringkasan setiap siklus sinkronisasi (berhasil, gagal, jumlah konflik).

### 3.9 Aturan Integritas Data Lintas Entitas
- Setiap entitas yang dapat dihapus menggunakan penghapusan lembut (penandaan waktu hapus), tidak ada penghapusan permanen otomatis kecuali melalui prosedur retensi data resmi.
- Setiap entitas finansial dan klinis memiliki nomor versi yang bertambah setiap perubahan, digunakan sebagai dasar deteksi konflik, bukan timestamp.
- Tarif rawat inap tidak pernah disimpan sebagai nilai tunggal yang dapat ditimpa — selalu sebagai rangkaian periode bertarif dengan tanggal mulai dan selesai berlaku.
- Stok inventaris tidak pernah dikurangi pada saat resep dibuat — pengurangan hanya terjadi pada saat transaksi pembayaran diproses, dengan validasi ulang ketersediaan stok pada momen tersebut.

---

## 4. ARSITEKTUR FRONTEND

### 4.1 Filosofi Rendering
- Server Components digunakan untuk pengambilan data awal yang tidak memerlukan interaktivitas tinggi, demi mengurangi JavaScript yang dikirim ke client.
- Client Components digunakan secara selektif hanya untuk bagian yang memerlukan state interaktif, polling data lokal, atau form.
- Setiap rute memiliki batas pemuatan (loading boundary) granular per bagian konten, tidak ada satu pemuat halaman tunggal yang memblokir seluruh tampilan.
- Setiap navigasi antar rute dalam aplikasi diasumsikan harus terasa instan — data yang dapat diprediksi dimuat lebih dulu sebelum pengguna benar-benar mengklik.

### 4.2 Struktur Navigasi
- Kelompok rute otentikasi: halaman masuk, registrasi klinik, halaman status perangkat membutuhkan verifikasi ulang.
- Kelompok rute dashboard utama: ringkasan operasional harian, akses cepat ke antrian, rekam medis terbaru, peringatan stok.
- Kelompok rute pelanggan dan hewan: daftar, pencarian, detail, riwayat.
- Kelompok rute antrian: papan status pelayanan real-time, formulir pendaftaran antrian baru.
- Kelompok rute klinis: formulir pemeriksaan, pembuat resep, riwayat medis per hewan.
- Kelompok rute rawat inap: peta visual kandang, detail episode rawat inap, riwayat monitoring.
- Kelompok rute kasir/pembayaran: pembuat faktur, antarmuka penerimaan pembayaran, cetak struk.
- Kelompok rute inventaris: daftar stok, peringatan stok rendah dan kedaluwarsa, riwayat transaksi.
- Kelompok rute laporan: ringkasan finansial, ringkasan operasional, ekspor data.
- Kelompok rute administratif: manajemen pengguna dan peran, manajemen perangkat, resolusi konflik sinkronisasi, log audit, pengaturan klinik.

### 4.3 Komponen Bersama Lintas Modul
- Komponen pencarian generik dengan penundaan input, selalu mengambil data dari basis data lokal terlebih dahulu.
- Komponen formulir generik dengan validasi skema terpadu dan status pengiriman optimistik.
- Komponen tabel dengan pengguliran virtual untuk kumpulan data besar.
- Komponen status sinkronisasi global yang selalu terlihat, menunjukkan keadaan online/offline, waktu sinkron terakhir, dan jumlah perubahan tertunda.
- Komponen pemberitahuan sementara untuk konfirmasi maupun kegagalan aksi.
- Komponen kerangka pemuatan yang menyerupai bentuk akhir konten, bukan pemutar generik.

### 4.4 Pengelolaan Status Antarmuka
- Setiap aksi penulisan data mengikuti pola pembaruan optimistik: antarmuka memperbarui tampilan segera, penulisan ke basis data lokal terjadi di latar belakang, sinkronisasi ke server terjadi independen tanpa memblokir antarmuka.
- Kegagalan pada penulisan lokal harus mengembalikan tampilan ke kondisi sebelumnya dan memberi tahu pengguna secara jelas, tanpa kehilangan data masukan pengguna.
- Kegagalan sinkronisasi ke server tidak boleh mengembalikan tampilan, karena data sudah valid secara lokal — kegagalan ini hanya memengaruhi indikator status sinkronisasi.

### 4.5 Aksesibilitas & Responsivitas
- Seluruh antarmuka harus dapat digunakan dengan papan ketik penuh dan kompatibel pembaca layar.
- Tata letak harus berfungsi baik pada layar desktop ukuran klinik maupun tablet yang digunakan dokter saat memeriksa.
- Kontras warna dan ukuran target sentuh mengikuti standar aksesibilitas yang berlaku umum.

### 4.6 Mode Aplikasi Web Progresif
- Aplikasi dapat dipasang sebagai aplikasi mandiri di perangkat.
- Aset statis menggunakan strategi pengambilan dari cache terlebih dahulu.
- Permintaan data menggunakan strategi jaringan terlebih dahulu dengan jatuh ke cache bila jaringan tidak tersedia, kecuali untuk data yang memang seharusnya selalu berasal dari basis data lokal.
- Tersedia sinkronisasi latar belakang yang berjalan otomatis ketika koneksi pulih, tanpa memerlukan aplikasi dalam keadaan terbuka aktif di latar depan.

---

## 5. ARSITEKTUR BACKEND

### 5.1 Filosofi Endpoint
- Setiap titik akhir yang mengubah data wajib melalui pemeriksaan identitas dan pemeriksaan otorisasi sebelum logika bisnis apa pun dijalankan.
- Setiap titik akhir yang melibatkan lebih dari satu langkah penulisan data wajib dibungkus dalam satu transaksi basis data yang bersifat atomik — seluruh langkah berhasil bersama atau seluruh langkah dibatalkan bersama.
- Tidak ada titik akhir yang mempercayai data perhitungan yang dikirim dari client (seperti total harga atau status izin) — semua perhitungan dan keputusan otorisasi yang berdampak pada integritas data dihitung ulang di server.

### 5.2 Domain Layanan Backend
- Layanan Autentikasi: pendaftaran klinik baru, masuk, perpanjangan sesi, keluar, pendaftaran dan pencabutan perangkat.
- Layanan Otorisasi: pemeriksaan izin berbasis peran yang dipanggil oleh setiap layanan lain sebelum eksekusi, mencatat setiap keputusan ke log audit.
- Layanan Pelanggan & Hewan: operasi data dasar dengan validasi format.
- Layanan Antrian: pembuatan nomor urut yang aman dari kondisi balapan, logika prioritas panggilan berikutnya, status real-time.
- Layanan Klinis: pencatatan rekam medis, pembuatan resep dengan pengecekan ketersediaan stok non-mengikat.
- Layanan Rawat Inap: penempatan kandang, pencatatan dan perubahan tarif sebagai riwayat periode, pencatatan monitoring harian, proses pemulangan dengan kalkulasi biaya berbasis seluruh riwayat tarif.
- Layanan Inventaris: pengurangan stok yang aman dari kondisi balapan menggunakan kontrol versi optimis, rotasi batch berdasarkan kedaluwarsa terdekat.
- Layanan Finansial: pembuatan faktur dari rekam medis dan resep, pemrosesan pembayaran sebagai satu transaksi atomik yang mencakup validasi pembayaran berlebih, pengurangan stok aktual, dan pencatatan audit.
- Layanan Sinkronisasi: penerimaan kelompok perubahan dari client, validasi versi skema, deteksi konflik berbasis versi data, penyimpanan konflik untuk resolusi manual.
- Layanan Laporan: agregasi data finansial dan operasional dengan kueri yang dioptimalkan, tanpa pola kueri berulang per baris.
- Layanan Audit: pencatatan terstruktur dari seluruh layanan lain, hanya dapat ditambah, tidak dapat diubah atau dihapus oleh peran apa pun melalui jalur normal aplikasi.
- Layanan Cadangan: ekspor terjadwal seluruh data klinik ke format arsip terkompresi, dengan kemampuan pulih kembali setelah verifikasi kompatibilitas versi.

### 5.3 Kontrak Antar Layanan
- Setiap layanan yang melibatkan perubahan stok, status faktur, atau status rawat inap harus dapat dijalankan ulang secara aman tanpa efek ganda jika dipanggil dua kali dengan permintaan identik (idempotensi pada level operasi finansial dan inventaris).
- Setiap layanan harus mengembalikan kode kesalahan terstruktur yang dapat dibedakan secara semantik, bukan pesan generik, agar client dapat menampilkan tindakan korektif yang tepat.

---

## 6. ARSITEKTUR BASIS DATA

### 6.1 Dua Basis Data dengan Peran Berbeda
- Basis data lokal: menyimpan seluruh data operasional untuk akses instan tanpa jaringan, tidak menyimpan kredensial rahasia apa pun.
- Basis data server: satu-satunya penyimpan kredensial, satu-satunya penegak kebijakan isolasi data antar klinik di tingkat baris, tujuan akhir replikasi dan cadangan.

### 6.2 Strategi Pengindeksan
- Setiap kolom kunci asing yang sering difilter memiliki indeks.
- Setiap kolom yang digunakan untuk pencarian teks pelanggan memiliki indeks yang mendukung pencarian sebagian maupun pencocokan awalan.
- Setiap kolom status memiliki indeks, dan kombinasi klinik-status memiliki indeks gabungan untuk kueri papan operasional yang sering dijalankan.
- Setiap kolom tanggal yang digunakan untuk laporan periodik memiliki indeks.

### 6.3 Strategi Kontrol Konkurensi
- Setiap entitas yang rawan diubah bersamaan oleh lebih dari satu pengguna atau perangkat memiliki nomor versi yang menjadi syarat keberhasilan pembaruan — pembaruan ditolak jika versi yang dikirim tidak sesuai dengan versi terbaru di basis data, mencegah penimpaan diam-diam.
- Operasi pengurangan stok dan operasi pembayaran menggunakan transaksi basis data penuh dengan kunci baris efektif selama durasi transaksi.

### 6.4 Strategi Migrasi Skema
- Setiap perubahan skema pada basis data lokal harus kompatibel dengan kemungkinan adanya data tertunda sinkronisasi yang masih menggunakan skema versi sebelumnya — perubahan tidak boleh menyebabkan data tertunda tersebut gagal disinkronkan tanpa proses migrasi data eksplisit.
- Setiap perubahan skema dicatat dengan nomor versi yang dibandingkan saat proses sinkronisasi; ketidaksesuaian versi menahan proses sinkronisasi item terkait hingga migrasi selesai, bukan memaksakan sinkronisasi yang dapat merusak data.

### 6.5 Kebijakan Keamanan Tingkat Baris
- Basis data server menerapkan kebijakan yang membatasi setiap operasi baca dan tulis hanya pada baris yang memiliki identitas klinik sesuai dengan identitas klinik pengguna yang terotentikasi, sebagai lapisan pertahanan terakhir yang independen dari kebenaran kode aplikasi.

### 6.6 Strategi Cadangan & Retensi
- Pencadangan penuh terjadwal harian, disimpan lokal dan direplikasi ke penyimpanan server ketika jaringan tersedia.
- Data yang dihapus lembut dipertahankan untuk periode retensi tertentu sebelum memenuhi syarat penghapusan permanen melalui prosedur resmi, bukan otomatis tanpa jejak.
- Log audit tidak termasuk dalam siklus penghapusan rutin data operasional; retensinya mengikuti kebijakan kepatuhan terpisah.

---

## 7. ARSITEKTUR KEAMANAN

### 7.1 Model Kepercayaan
- Client tidak dipercaya untuk keputusan otorisasi maupun untuk integritas perhitungan finansial — hanya dipercaya untuk menyajikan data dan mengumpulkan input.
- Perangkat tidak dipercaya untuk mengklaim identitasnya sendiri tanpa verifikasi — identitas perangkat ditandatangani secara kriptografis oleh server pada saat pendaftaran pertama dan diverifikasi ulang pada interaksi berikutnya.

### 7.2 Autentikasi
- Kata sandi tidak pernah disimpan dalam bentuk apa pun selain hasil fungsi hash satu arah dengan faktor kerja yang memadai, dan hanya disimpan di basis data server, tidak pernah direplikasi ke basis data lokal.
- Sesi menggunakan dua jenis token: token akses berumur pendek untuk operasi rutin, dan token penyegaran berumur panjang untuk memperbarui token akses tanpa memerlukan kata sandi ulang.
- Masuk dalam keadaan tidak ada jaringan diperbolehkan hanya jika terdapat token tersimpan yang masih dalam masa berlaku dan belum melewati batas tidak aktif maksimum, diverifikasi melalui tanda tangan kriptografis token tanpa perlu menghubungi server.

### 7.3 Otorisasi
- Setiap peran memiliki matriks izin yang eksplisit per fungsi sistem.
- Pemeriksaan izin terjadi dua kali: satu kali di client untuk menyembunyikan elemen antarmuka yang tidak relevan, satu kali wajib di server sebelum eksekusi efektif apa pun, tanpa terkecuali.
- Setiap keputusan otorisasi, baik diizinkan maupun ditolak, dicatat ke log audit.

### 7.4 Keamanan Perangkat & Sesi
- Setiap perangkat baru memerlukan proses pendaftaran yang menghasilkan rahasia unik milik server, digunakan untuk memvalidasi keaslian perangkat tersebut pada interaksi berikutnya.
- Sesi memiliki masa berlaku maksimum dan batas tidak aktif; pelampauan salah satu menyebabkan sesi tidak lagi valid dan memerlukan autentikasi ulang saat jaringan tersedia.
- Pencabutan sesi pada satu perangkat tidak memengaruhi sesi aktif pada perangkat lain milik pengguna yang sama.

### 7.5 Enkripsi Data Sensitif
- Data sensitif non-kredensial yang memerlukan kerahasiaan tambahan dienkripsi sebelum disimpan, dengan kunci enkripsi yang dikelola terpisah dari data itu sendiri dan tidak pernah disertakan dalam kode sumber atau basis data yang sama.

### 7.6 Validasi Input
- Setiap data yang diterima dari client divalidasi ulang di server menggunakan skema yang sama dengan validasi client, tanpa mengandalkan validasi client sebagai satu-satunya pertahanan.

---

## 8. ARSITEKTUR SINKRONISASI & RESOLUSI KONFLIK

### 8.1 Alur Data Keluar (Client ke Server)
- Setiap perubahan data lokal dicatat ke antrian sinkronisasi segera setelah ditulis ke basis data lokal, disertai nomor versi skema saat itu.
- Proses pengiriman berjalan dalam kelompok, terurut berdasarkan waktu pembuatan, dengan mekanisme percobaan ulang bertingkat ketika gagal, hingga batas maksimum sebelum ditandai memerlukan penanganan manual.

### 8.2 Alur Data Masuk (Server ke Client)
- Perubahan dari perangkat lain pada klinik yang sama direplikasi ke perangkat ini melalui mekanisme sinkronisasi yang sama, dengan deteksi konflik yang sama berlaku dua arah.

### 8.3 Deteksi Konflik
- Konflik terdeteksi ketika versi data lokal dan versi data server keduanya telah berubah sejak sinkronisasi terakhir yang berhasil — bukan sekadar berdasarkan stempel waktu mana yang lebih baru.
- Ketika tidak ada konflik nyata (hanya satu sisi yang berubah), sisi yang tidak berubah mengikuti sisi yang berubah tanpa intervensi pengguna.

### 8.4 Resolusi Konflik
- Setiap konflik nyata masuk ke antrian konflik dengan kedua versi data tersimpan lengkap, menunggu keputusan eksplisit dari pengguna berwenang.
- Pilihan resolusi yang tersedia: mempertahankan versi lokal, menggunakan versi server, atau penggabungan manual oleh pengguna.
- Tidak ada jalur otomatis yang menimpa salah satu versi tanpa keputusan eksplisit ini.

### 8.5 Penanganan Ketidaksesuaian Skema
- Item antrian sinkronisasi yang dibuat dengan versi skema berbeda dari versi skema server saat ini ditahan dan ditandai memerlukan migrasi, tidak dipaksakan untuk sinkron langsung.

### 8.6 Indikator Status untuk Pengguna
- Status koneksi, waktu sinkronisasi terakhir, dan jumlah perubahan tertunda selalu terlihat dan diperbarui secara langsung tanpa memerlukan pemuatan ulang halaman.

---

## 9. ARSITEKTUR INTEGRITAS FINANSIAL & INVENTARIS

### 9.1 Prinsip Tidak Ada Status Setengah Jadi
- Operasi pembayaran yang melibatkan pengurangan stok dan pembaruan status faktur harus selesai sepenuhnya atau gagal sepenuhnya — tidak boleh ada kondisi di mana pembayaran tercatat namun stok tidak terkurangi, atau sebaliknya.

### 9.2 Prinsip Validasi Ulang pada Titik Kritis
- Ketersediaan stok diperiksa secara mengikat hanya pada saat pembayaran diproses, bukan pada saat resep dibuat — karena jeda waktu antara resep dan pembayaran dapat mengubah ketersediaan stok secara nyata.

### 9.3 Prinsip Riwayat Tarif Rawat Inap
- Biaya rawat inap akhir selalu dihitung dari akumulasi seluruh periode tarif yang pernah berlaku selama episode tersebut, bukan dari tarif tunggal yang berlaku saat pemulangan.

### 9.4 Prinsip Rotasi Stok
- Pengurangan stok mengikuti urutan kedaluwarsa terdekat terlebih dahulu di antara batch yang tersedia untuk satu jenis barang yang sama.

---

## 10. MATRIKS PERAN & IZIN

Empat peran inti: Pemilik, Dokter, Staf, Pelanggan. Untuk setiap fungsi sistem (manajemen pengguna, manajemen antrian, rekam medis, resep, rawat inap, inventaris, kasir/pembayaran, laporan, pengaturan klinik), terdapat definisi akses penuh, akses terbatas pada data milik sendiri, atau tidak ada akses, sesuai prinsip berikut:
- Pemilik memiliki akses penuh ke seluruh fungsi tanpa kecuali, termasuk fungsi administratif yang tidak tersedia untuk peran lain.
- Dokter memiliki akses penuh ke fungsi klinis (rekam medis, resep, rawat inap, antrian) namun tidak memiliki akses ke manajemen pengguna, inventaris, kasir, atau pengaturan.
- Staf memiliki akses penuh ke fungsi operasional non-klinis (antrian, kasir, inventaris) dan akses terbatas ke rekam medis serta rawat inap (dapat melihat dan membantu pencatatan operasional, tidak dapat menentukan diagnosis atau resep), namun tidak memiliki akses ke manajemen pengguna atau pengaturan.
- Pelanggan hanya memiliki akses melihat data miliknya sendiri (riwayat hewan, riwayat medis, riwayat resep), tanpa akses tulis ke data klinis maupun operasional apa pun.

---

## 11. STANDAR KUALITAS & PENGUJIAN

### 11.1 Kategori Pengujian Wajib
- Pengujian satuan untuk setiap fungsi utilitas keamanan dan perhitungan finansial.
- Pengujian integrasi untuk setiap operasi yang melibatkan transaksi basis data multi-langkah, termasuk skenario konkurensi yang disengaja.
- Pengujian mode tanpa jaringan untuk setiap alur kerja klinis inti, memastikan data tersimpan lokal dan masuk antrian sinkronisasi dengan benar.
- Pengujian otorisasi untuk setiap titik akhir yang dilindungi, memastikan penolakan terjadi pada server bahkan ketika client diasumsikan dikompromikan.
- Pengujian isolasi data antar klinik pada tingkat kebijakan basis data, bukan hanya pada tingkat logika aplikasi.

### 11.2 Standar Penerimaan Performa
- Setiap operasi baca dari basis data lokal untuk kebutuhan tampilan harian harus terasa instan bagi pengguna pada perangkat kelas menengah.
- Setiap navigasi antar bagian aplikasi tidak boleh menampilkan kekosongan tampilan penuh; bagian yang sudah siap data harus tampil tanpa menunggu bagian lain.
- Setiap kueri laporan yang melibatkan agregasi data besar harus dioptimalkan menggunakan indeks yang sesuai dan menghindari pola pengambilan data berulang per baris.

### 11.3 Standar Penerimaan Keamanan
- Tidak ada titik akhir yang dapat dieksekusi tanpa pemeriksaan identitas dan otorisasi yang valid.
- Tidak ada kredensial rahasia yang dapat ditemukan dalam basis data lokal, penyimpanan browser yang tidak terenkripsi, atau kode sumber.
- Tidak ada kebocoran data antar klinik dalam skenario pengujian isolasi tingkat baris.

### 11.4 Standar Penerimaan Integritas Data
- Tidak ada skenario pengujian konkurensi yang menghasilkan stok negatif atau status faktur yang tidak konsisten dengan rekaman pembayaran aktualnya.
- Tidak ada skenario konflik sinkronisasi yang menghasilkan penimpaan data tanpa rekaman jejak konflik tersebut.

---

## 12. SIKLUS HIDUP OPERASIONAL & PEMELIHARAAN

### 12.1 Pemeriksaan Harian
Status pencadangan, kekosongan antrian sinkronisasi, ketiadaan kesalahan kritis, ukuran basis data dalam batas wajar, dan keaktifan sesi pengguna diperiksa sebagai bagian dari rutinitas operasional harian sistem.

### 12.2 Pemeliharaan Berkala
Pembersihan sesi lampau, pengarsipan log audit lampau sesuai kebijakan retensi, peninjauan konflik sinkronisasi yang belum terselesaikan, verifikasi akurasi inventaris, dan verifikasi keutuhan catatan faktur dilakukan secara berkala terjadwal.

### 12.3 Pemeliharaan Berkala Lebih Luas
Optimisasi basis data, verifikasi pemulihan cadangan secara aktual (bukan hanya keberadaan filenya), uji simulasi pemulihan bencana, peninjauan keamanan, dan peninjauan kesesuaian peran pengguna terhadap fungsi jabatan aktual dilakukan dalam siklus yang lebih jarang namun tetap terjadwal tetap.

---

## 13. ATURAN PERUBAHAN DOKUMEN INI

Dokumen ini adalah sumber kebenaran mutlak tunggal untuk seluruh pengembangan Haland PetCare. Setiap perubahan arsitektur, struktur data, kebijakan keamanan, atau alur kerja operasional wajib diperbarui di dokumen ini terlebih dahulu sebelum diimplementasikan dalam kode apa pun. Implementasi yang menyimpang dari dokumen ini tanpa pembaruan dokumen terlebih dahulu dianggap sebagai pelanggaran proses, terlepas dari seberapa baik fungsinya secara teknis.

