package com.muslimsweets.msms.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.muslimsweets.msms.data.local.room.*
import com.muslimsweets.msms.data.repository.SweetShopRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class ShopUiState(
    val currentShop: ShopEntity? = null,
    val products: List<ProductEntity> = emptyList(),
    val sales: List<SaleEntity> = emptyList(),
    val bills: List<BillEntity> = emptyList(),
    val totalStockKg: Double = 0.0,
    val totalStockPcs: Double = 0.0,
    val todayRevenue: Double = 0.0,
    val weeklyAverageSales: Double = 0.0,
    val top5Peaks: List<SaleEntity> = emptyList()
)

class ShopViewModel(private val repository: SweetShopRepository) : ViewModel() {

    private val _activeShopId = MutableStateFlow<String>("")
    val activeShopId: StateFlow<String> = _activeShopId.asStateFlow()

    val shops: StateFlow<List<ShopEntity>> = repository.getShops()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val uiState: StateFlow<ShopUiState> = _activeShopId.flatMapLatest { shopId ->
        if (shopId.isEmpty()) {
            flowOf(ShopUiState())
        } else {
            combine(
                repository.getProductsByShop(shopId),
                repository.getSalesByShop(shopId),
                repository.getBillsByShop(shopId)
            ) { products, sales, bills ->
                val kgStock = products.filter { it.unit == "kg" }.sumOf { it.currentStock }
                val pcsStock = products.filter { it.unit == "piece" }.sumOf { it.currentStock }
                val today = System.currentTimeMillis() - 86400000L
                val todaySales = sales.filter { it.timestamp >= today }.sumOf { it.totalAmount }
                val weeklyAvg = if (sales.isNotEmpty()) sales.take(7).sumOf { it.totalAmount } / 7.0 else 0.0
                val peaks = sales.sortedByDescending { it.totalAmount }.take(5)

                ShopUiState(
                    products = products,
                    sales = sales,
                    bills = bills,
                    totalStockKg = kgStock,
                    totalStockPcs = pcsStock,
                    todayRevenue = todaySales,
                    weeklyAverageSales = weeklyAvg,
                    top5Peaks = peaks
                )
            }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ShopUiState())

    fun selectShop(shopId: String) {
        _activeShopId.value = shopId
    }

    fun addStock(productId: String, addedQty: Double, costPrice: Double) {
        viewModelScope.launch {
            val state = uiState.value
            val product = state.products.find { it.id == productId } ?: return@launch
            val newTotal = product.currentStock + addedQty
            repository.updateStock(productId, newTotal)
            repository.recordStockIntake(
                StockMovementEntity(
                    id = java.util.UUID.randomUUID().toString(),
                    shopId = product.shopId,
                    productId = product.id,
                    productName = product.name,
                    productNameBn = product.nameBn,
                    quantityAdded = addedQty,
                    unit = product.unit,
                    costPrice = costPrice
                )
            )
        }
    }

    fun recordSale(productId: String, soldQty: Double) {
        viewModelScope.launch {
            val state = uiState.value
            val product = state.products.find { it.id == productId } ?: return@launch
            if (soldQty > product.currentStock) return@launch

            val remaining = (product.currentStock - soldQty).coerceAtLeast(0.0)
            val total = soldQty * product.unitPrice
            val cost = soldQty * product.costPrice

            repository.recordSale(
                SaleEntity(
                    id = java.util.UUID.randomUUID().toString(),
                    shopId = product.shopId,
                    productId = product.id,
                    productName = product.name,
                    productNameBn = product.nameBn,
                    quantitySold = soldQty,
                    unit = product.unit,
                    pricePerUnit = product.unitPrice,
                    totalAmount = total,
                    costTotal = cost,
                    previousStock = product.currentStock,
                    remainingStock = remaining,
                    year = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR),
                    month = java.util.Calendar.getInstance().get(java.util.Calendar.MONTH),
                    dayOfWeek = java.util.Calendar.getInstance().get(java.util.Calendar.DAY_OF_WEEK)
                )
            )
        }
    }
}
