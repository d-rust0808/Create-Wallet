// Trước tiên, cài đặt các thư viện cần thiết:
// npm install ethers@5.7.2 @solana/web3.js bitcoinjs-lib tronweb @cosmjs/crypto bip39 exceljs

const { Wallet } = require("ethers"); // Ethereum, BSC, Polygon
const { Keypair } = require("@solana/web3.js"); // Solana
const bitcoin = require("bitcoinjs-lib"); // Bitcoin
const TronWeb = require("tronweb"); // Tron
const { Slip10, Slip10Curve } = require("@cosmjs/crypto"); // Cosmos
const bip39 = require("bip39");
const ExcelJS = require("exceljs");
const readline = require("readline"); // Để hỏi người dùng qua terminal

// Tạo interface readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Hàm hỏi người dùng
function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

// Hàm tạo ví dựa trên loại blockchain
function generateWallet(type = "eth") {
  const mnemonicPhrase = bip39.generateMnemonic();

  switch (type.toLowerCase()) {
    case "eth": // Ethereum (MetaMask, OKX)
      const ethWallet = Wallet.fromPhrase(mnemonicPhrase);
      return {
        type: "Ethereum",
        mnemonic: mnemonicPhrase,
        privateKey: ethWallet.privateKey,
        address: ethWallet.address,
      };

    case "bsc": // Binance Smart Chain (MetaMask)
      const bscWallet = Wallet.fromPhrase(mnemonicPhrase);
      return {
        type: "Binance Smart Chain",
        mnemonic: mnemonicPhrase,
        privateKey: bscWallet.privateKey,
        address: bscWallet.address,
      };

    case "sol": // Solana (Phantom)
      const solSeed = bip39.mnemonicToSeedSync(mnemonicPhrase).slice(0, 32);
      const solWallet = Keypair.fromSeed(solSeed);
      return {
        type: "Solana",
        mnemonic: mnemonicPhrase,
        privateKey: Buffer.from(solWallet.secretKey).toString("hex"),
        address: solWallet.publicKey.toBase58(),
      };

    case "btc": // Bitcoin
      const btcNetwork = bitcoin.networks.bitcoin;
      const btcSeed = bip39.mnemonicToSeedSync(mnemonicPhrase);
      const btcRoot = bitcoin.bip32.fromSeed(btcSeed, btcNetwork);
      const btcWallet = btcRoot.derivePath("m/44'/0'/0'/0/0");
      const { address: btcAddress } = bitcoin.payments.p2pkh({
        pubkey: btcWallet.publicKey,
        network: btcNetwork,
      });
      return {
        type: "Bitcoin",
        mnemonic: mnemonicPhrase,
        privateKey: btcWallet.toWIF(),
        address: btcAddress,
      };

    case "tron": // Tron (TronLink)
      const tronSeed = bip39.mnemonicToSeedSync(mnemonicPhrase);
      const tronPrivateKey = tronSeed.slice(0, 32).toString("hex");
      const tronWeb = new TronWeb({
        fullHost: "https://api.trongrid.io",
      });
      const tronWallet = tronWeb.utils.accounts.generateAccount(tronPrivateKey);
      return {
        type: "Tron",
        mnemonic: mnemonicPhrase,
        privateKey: tronPrivateKey,
        address: tronWallet.address.base58,
      };

    case "cosmos": // Cosmos (Keplr)
      const cosmosSeed = bip39.mnemonicToSeedSync(mnemonicPhrase);
      const cosmosPath = "m/44'/118'/0'/0/0";
      const cosmosKey = Slip10.derivePath(
        Slip10Curve.Secp256k1,
        cosmosSeed,
        cosmosPath
      );
      const cosmosPrivKey = Buffer.from(cosmosKey.privkey).toString("hex");
      const cosmosAddress = Buffer.from(cosmosKey.chainCode)
        .toString("hex")
        .slice(0, 40);
      return {
        type: "Cosmos",
        mnemonic: mnemonicPhrase,
        privateKey: cosmosPrivKey,
        address: cosmosAddress, // Giả lập, thực tế cần Bech32
      };

    default:
      throw new Error(
        "Loại ví không hỗ trợ. Chọn: eth, bsc, sol, btc, tron, cosmos"
      );
  }
}

// Hàm xuất dữ liệu ra Excel
async function exportToExcel(wallets, type) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`${type} Wallets`);

  worksheet.columns = [
    { header: "Type", key: "type", width: 20 },
    { header: "Mnemonic", key: "mnemonic", width: 50 },
    { header: "Private Key", key: "privateKey", width: 70 },
    { header: "Address", key: "address", width: 45 },
  ];

  wallets.forEach((wallet) => worksheet.addRow(wallet));
  const filename = `${type.toLowerCase()}_wallets.xlsx`;
  await workbook.xlsx.writeFile(filename);
  console.log(`File Excel đã được tạo: ${filename}`);
}

// Hàm chính
async function main() {
  try {
    console.log("Chương trình tạo ví tiền điện tử");
    console.log("--------------------------------");

    let continueCreating = true;

    while (continueCreating) {
      // Hỏi loại ví
      const walletType = await askQuestion(
        "Bạn muốn tạo ví nào? (eth, bsc, sol, btc, tron, cosmos): "
      );

      // Kiểm tra loại ví hợp lệ
      const validTypes = ["eth", "bsc", "sol", "btc", "tron", "cosmos"];
      if (!validTypes.includes(walletType.toLowerCase())) {
        console.log(
          "Loại ví không hợp lệ. Chọn: eth, bsc, sol, btc, tron, cosmos"
        );
        continue;
      }

      // Hỏi số lượng ví
      const numberInput = await askQuestion("Số lượng ví muốn tạo: ");
      const numberOfWallets = parseInt(numberInput);

      if (isNaN(numberOfWallets) || numberOfWallets <= 0) {
        console.log("Vui lòng nhập số lượng ví hợp lệ (số nguyên dương).");
        continue;
      }

      // Tạo ví
      const wallets = [];
      console.log(`Đang tạo ${numberOfWallets} ví ${walletType}...`);

      for (let i = 0; i < numberOfWallets; i++) {
        try {
          const wallet = generateWallet(walletType);
          wallets.push(wallet);
          console.log(`Ví ${i + 1} (${wallet.type}):`, wallet);
        } catch (error) {
          console.error(`Lỗi khi tạo ví ${i + 1}:`, error.message);
        }
      }

      // Xuất ra file Excel riêng
      if (wallets.length > 0) {
        try {
          await exportToExcel(wallets, walletType);
        } catch (error) {
          console.error(`Lỗi khi xuất file Excel:`, error.message);
        }
      } else {
        console.log("Không có ví nào được tạo để xuất ra Excel.");
      }

      // Hỏi xem có muốn tiếp tục không
      const continueResponse = await askQuestion(
        "Bạn có muốn tạo ví khác không? (yes/no): "
      );
      continueCreating = continueResponse.toLowerCase() === "yes";
    }
  } catch (error) {
    console.error("Lỗi không xác định:", error.message);
  } finally {
    rl.close();
    console.log("Đã hoàn tất!");
  }
}

// Để tắt cảnh báo deprecation
process.env.NODE_NO_WARNINGS = 1;

main().catch((err) => {
  console.error("Lỗi chương trình:", err);
  rl.close();
});
