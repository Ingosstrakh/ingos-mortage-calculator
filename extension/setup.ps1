# PowerShell скрипт для копирования файлов калькулятора в расширение

Write-Host "🚀 Настройка расширения Ингосстрах..." -ForegroundColor Cyan
Write-Host ""

# Список файлов для копирования
$files = @(
    "config_banks.js",
    "tariffs_life.js",
    "tariffs_property.js",
    "tariffs_ifl.js",
    "parser.js",
    "installment_calculator.js",
    "calculator-utils.js",
    "calculator-medical.js",
    "calculator-validation.js",
    "calculator-insurance-life.js",
    "calculator-insurance-property.js",
    "calculator-insurance-title.js",
    "calculator-installment.js",
    "calculator-main.js",
    "calculator-variant2-helpers.js",
    "calculator-variant2-constructor.js",
    "calculator-variant2.js",
    "calculator-variant3.js",
    "calculator-variant2-ui.js"
)

# Получаем путь к родительской папке (где находятся файлы калькулятора)
$sourceDir = Split-Path -Parent $PSScriptRoot
$targetDir = $PSScriptRoot

Write-Host "📁 Исходная папка: $sourceDir" -ForegroundColor Yellow
Write-Host "📁 Целевая папка: $targetDir" -ForegroundColor Yellow
Write-Host ""

# Счетчики
$copied = 0
$missing = 0

# Копируем файлы
foreach ($file in $files) {
    $sourcePath = Join-Path $sourceDir $file
    $targetPath = Join-Path $targetDir $file
    
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $targetPath -Force
        Write-Host "✓ Скопирован: $file" -ForegroundColor Green
        $copied++
    } else {
        Write-Host "✗ Не найден: $file" -ForegroundColor Red
        $missing++
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 Результат:" -ForegroundColor Cyan
Write-Host "   Скопировано: $copied файлов" -ForegroundColor Green
if ($missing -gt 0) {
    Write-Host "   Не найдено: $missing файлов" -ForegroundColor Red
}
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Создаем папку для иконок если её нет
$iconsDir = Join-Path $targetDir "icons"
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
    Write-Host "📁 Создана папка: icons" -ForegroundColor Yellow
}

# Проверяем наличие иконок
$iconSizes = @(16, 32, 48, 128)
$iconsExist = $true

foreach ($size in $iconSizes) {
    $iconPath = Join-Path $iconsDir "icon$size.png"
    if (-not (Test-Path $iconPath)) {
        $iconsExist = $false
        break
    }
}

if (-not $iconsExist) {
    Write-Host ""
    Write-Host "⚠️  ВНИМАНИЕ: Иконки не найдены!" -ForegroundColor Yellow
    Write-Host "   Создайте иконки в папке icons/:" -ForegroundColor Yellow
    Write-Host "   - icon16.png (16x16)" -ForegroundColor Yellow
    Write-Host "   - icon32.png (32x32)" -ForegroundColor Yellow
    Write-Host "   - icon48.png (48x48)" -ForegroundColor Yellow
    Write-Host "   - icon128.png (128x128)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Можно использовать онлайн-сервисы:" -ForegroundColor Yellow
    Write-Host "   - https://www.favicon-generator.org/" -ForegroundColor Cyan
    Write-Host "   - https://realfavicongenerator.net/" -ForegroundColor Cyan
} else {
    Write-Host "✓ Иконки найдены" -ForegroundColor Green
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📝 Следующие шаги:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Откройте Chrome/Edge" -ForegroundColor White
Write-Host "2. Перейдите в chrome://extensions/" -ForegroundColor White
Write-Host "3. Включите 'Режим разработчика'" -ForegroundColor White
Write-Host "4. Нажмите 'Загрузить распакованное расширение'" -ForegroundColor White
Write-Host "5. Выберите папку: $targetDir" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Готово! Расширение будет установлено." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Пауза перед закрытием
Read-Host "Нажмите Enter для выхода"
