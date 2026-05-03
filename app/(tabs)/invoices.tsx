import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useCallback, useRef, useState } from "react";
import { api } from "@/services/api";
import { Order } from "@/types";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

const COLORS = {
  cream: "#F7EEDC",
  card: "#FFF9EE",
  brown: "#5A3825",
  gold: "#B8894A",
  dark: "#2B1A12",
  white: "#FFFFFF",
  red: "#D64545",
};

export default function Invoices() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editQty, setEditQty] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [newPrice, setNewPrice] = useState("");
  const [addSearch, setAddSearch] = useState("");

  const invoiceRef = useRef<ViewShot>(null);

  const loadOrders = async () => {
    try {
      const res = await api.get("/orders");
      setOrders(res.data);

      if (selectedOrder) {
        const updatedSelected = res.data.find(
          (o: any) => o.id === selectedOrder.id,
        );
        setSelectedOrder(updatedSelected || res.data[0] || null);
      } else {
        setSelectedOrder(res.data[0] || null);
      }
    } catch {
      Alert.alert("Error", "Cannot load invoices.");
    }
  };

  const loadProducts = async () => {
    const res = await api.get("/products");
    setProducts(res.data);
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([loadOrders(), loadProducts()]);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [selectedOrder?.id]),
  );

  const openEditItem = (item: any) => {
    setEditingItem(item);
    setEditQty(String(item.quantity));
    setEditPrice(String(item.price));
    setEditModalOpen(true);
  };

  const updateItem = async () => {
    if (!selectedOrder || !editingItem) return;

    if (!editQty || !editPrice) {
      Alert.alert("Required", "Quantity and price are required.");
      return;
    }

    const res = await api.patch(
      `/orders/${selectedOrder.id}/items/${editingItem.id}`,
      {
        quantity: Number(editQty),
        price: Number(editPrice),
      },
    );

    setSelectedOrder(res.data);
    setEditModalOpen(false);
    setEditingItem(null);
    await loadOrders();
  };

  const deleteItem = async (item: any) => {
    if (!selectedOrder) return;

    Alert.alert("Delete Item", "Remove this item from invoice?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const res = await api.delete(
            `/orders/${selectedOrder.id}/items/${item.id}`,
          );
          setSelectedOrder(res.data);
          await loadOrders();
        },
      },
    ]);
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const filteredAddProducts = products.filter((product) =>
    product.name.toLowerCase().includes(addSearch.toLowerCase()),
  );
  const openAddModal = () => {
    setAddSearch("");
    setSelectedProductId("");
    setSelectedVariantId("");
    setNewQty("1");
    setNewPrice("");
    setAddModalOpen(true);
  };

  const selectProduct = (product: any) => {
    setSelectedProductId(product.id);
    setSelectedVariantId("");
    setNewPrice("");
  };

  const selectVariant = (variant: any) => {
    setSelectedVariantId(variant.id);
    setNewPrice(String(variant.price));
  };

  const addItemToOrder = async () => {
    if (!selectedOrder || !selectedProductId || !selectedVariantId) {
      Alert.alert("Required", "Please select product and variant.");
      return;
    }

    if (!newQty || !newPrice) {
      Alert.alert("Required", "Quantity and price are required.");
      return;
    }

    const res = await api.post(`/orders/${selectedOrder.id}/items`, {
      productId: selectedProductId,
      variantId: selectedVariantId,
      quantity: Number(newQty),
      price: Number(newPrice),
    });

    setSelectedOrder(res.data);
    setAddModalOpen(false);
    await loadOrders();
  };

  const deleteWholeInvoice = async () => {
    if (!selectedOrder) return;

    Alert.alert(
      "Delete Invoice",
      `Delete ${selectedOrder.invoiceNo}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await api.delete(`/orders/${selectedOrder.id}`);
            setSelectedOrder(null);
            await loadOrders();
          },
        },
      ],
    );
  };

  const saveInvoiceImage = async () => {
    try {
      if (!invoiceRef.current?.capture) return;

      const uri = await invoiceRef.current.capture();
      const permission = await MediaLibrary.requestPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow photo library access.");
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("Saved", "Invoice image saved to your photos.");
    } catch {
      Alert.alert("Error", "Failed to save invoice image.");
    }
  };

  const shareInvoiceImage = async () => {
    try {
      if (!invoiceRef.current?.capture) return;

      const uri = await invoiceRef.current.capture();

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing not available");
        return;
      }

      await Sharing.shareAsync(uri);
    } catch {
      Alert.alert("Error", "Failed to share invoice.");
    }
  };

  const totalQty =
    selectedOrder?.items?.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0,
    ) || 0;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Invoices</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.invoiceList}
      >
        {orders.map((order) => (
          <TouchableOpacity
            key={order.id}
            onPress={() => setSelectedOrder(order)}
            style={[
              styles.invoiceCard,
              selectedOrder?.id === order.id && styles.invoiceCardActive,
            ]}
          >
            <Text
              style={[
                styles.invoiceNo,
                selectedOrder?.id === order.id && styles.invoiceNoActive,
              ]}
            >
              {order.invoiceNo}
            </Text>

            <Text
              style={[
                styles.invoiceAmount,
                selectedOrder?.id === order.id && styles.invoiceNoActive,
              ]}
            >
              ₱{formatMoney(order.total)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshAll} />
        }
      >
        {selectedOrder ? (
          <>
            <ViewShot ref={invoiceRef} options={{ format: "png", quality: 1 }}>
              <View style={styles.invoiceImage}>
                <Text style={styles.invoiceHeader}>
                  {(selectedOrder.customer?.name?.toUpperCase() ||
                    selectedOrder.customerName?.toUpperCase() ||
                    "WALK-IN") +
                    " / " +
                    (selectedOrder.platform?.toUpperCase() || "MESSENGER")}
                </Text>

                {selectedOrder.deliveryAt && (
                  <Text style={styles.deliveryText}>
                    Delivery: {formatInvoiceDate(selectedOrder.deliveryAt)}
                  </Text>
                )}

                {(selectedOrder.customer?.address ||
                  selectedOrder.customerAddress) && (
                  <Text style={styles.addressText}>
                    Address:{" "}
                    {selectedOrder.customer?.address?.toUpperCase() ||
                      selectedOrder.customerAddress?.toUpperCase()}
                  </Text>
                )}

                <View style={styles.headerRow}>
                  <Text style={[styles.cellHeader, styles.descriptionCol]}>
                    Description
                  </Text>
                  <Text style={[styles.cellHeader, styles.qtyCol]}>Qty.</Text>
                  <Text style={[styles.cellHeader, styles.priceCol]}>
                    Price
                  </Text>
                  <Text style={[styles.cellHeader, styles.totalCol]}>
                    Total
                  </Text>
                </View>

                {selectedOrder.items.map((item: any) => (
                  <View key={item.id} style={styles.dataRow}>
                    <Text style={[styles.cellTextLeft, styles.descriptionCol]}>
                      {(item.product?.name?.toUpperCase() || "") +
                        " - " +
                        (item.variant?.label?.toUpperCase() || "")}
                    </Text>

                    <Text style={[styles.cellText, styles.qtyCol]}>
                      {item.quantity}
                    </Text>

                    <Text style={[styles.cellText, styles.priceCol]}>
                      {formatMoney(item.price)}
                    </Text>

                    <Text style={[styles.cellText, styles.totalCol]}>
                      {formatMoney(item.total)}
                    </Text>
                  </View>
                ))}

                <View style={styles.finalRow}>
                  <Text style={[styles.totalTextLeft, styles.descriptionCol]}>
                    Total
                  </Text>
                  <Text style={[styles.totalText, styles.qtyCol]}>
                    {totalQty}
                  </Text>
                  <Text style={[styles.totalText, styles.priceCol]}></Text>
                  <Text style={[styles.totalText, styles.totalCol]}>
                    {formatMoney(selectedOrder.total)}
                  </Text>
                </View>
              </View>
            </ViewShot>

            <View style={styles.editPanel}>
              <View style={styles.editPanelHeader}>
                <Text style={styles.editPanelTitle}>Edit Invoice Items</Text>

                <TouchableOpacity
                  onPress={openAddModal}
                  style={styles.addItemBtn}
                >
                  <Ionicons name="add" size={18} color={COLORS.white} />
                  <Text style={styles.addItemText}>Add Item</Text>
                </TouchableOpacity>
              </View>

              {selectedOrder.items.map((item: any) => (
                <View key={item.id} style={styles.editItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.editItemName}>
                      {(item.product?.name || "").toUpperCase()}
                    </Text>
                    <Text style={styles.editItemSub}>
                      {item.variant?.label} • Qty {item.quantity} • ₱
                      {formatMoney(item.price)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => openEditItem(item)}
                    style={styles.editIconButton}
                  >
                    <Ionicons
                      name="create-outline"
                      size={18}
                      color={COLORS.white}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => deleteItem(item)}
                    style={styles.deleteIconButton}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={COLORS.white}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                onPress={saveInvoiceImage}
                style={styles.actionBtn}
              >
                <Ionicons
                  name="download-outline"
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.actionText}>Save Image</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={shareInvoiceImage}
                style={styles.actionBtnGold}
              >
                <Ionicons
                  name="share-social-outline"
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={deleteWholeInvoice}
              style={styles.deleteInvoiceBtn}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.white} />
              <Text style={styles.deleteInvoiceText}>Delete Whole Invoice</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No invoices yet.</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <Modal visible={editModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalSafeArea}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Edit Item</Text>

                <Text style={styles.modalLabel}>
                  {(editingItem?.product?.name || "").toUpperCase()} -{" "}
                  {editingItem?.variant?.label}
                </Text>

                <Text style={styles.modalLabel}>Quantity</Text>
                <TextInput
                  value={editQty}
                  onChangeText={setEditQty}
                  keyboardType="numeric"
                  style={styles.input}
                />

                <Text style={styles.modalLabel}>Price</Text>
                <TextInput
                  value={editPrice}
                  onChangeText={setEditPrice}
                  keyboardType="numeric"
                  style={styles.input}
                />

                <TouchableOpacity
                  onPress={updateItem}
                  style={styles.modalSaveBtn}
                >
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setEditModalOpen(false)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={addModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalSafeArea}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Add Item</Text>

                <TextInput
                  placeholder="Search product..."
                  placeholderTextColor="#9B8B7A"
                  value={addSearch}
                  onChangeText={setAddSearch}
                  style={styles.input}
                />

                <ScrollView style={{ maxHeight: 360 }}>
                  {filteredAddProducts.length === 0 ? (
                    <Text style={styles.emptyText}>No product found.</Text>
                  ) : (
                    filteredAddProducts.map((product) => (
                      <View key={product.id} style={styles.addProductCard}>
                        <Text style={styles.addProductName}>
                          {product.name}
                        </Text>

                        {product.variants.map((variant: any) => {
                          const active = selectedVariantId === variant.id;

                          return (
                            <TouchableOpacity
                              key={variant.id}
                              onPress={() => {
                                setSelectedProductId(product.id);
                                setSelectedVariantId(variant.id);
                                setNewPrice(String(variant.price));
                              }}
                              style={[
                                styles.addVariantRow,
                                active && styles.addVariantActive,
                              ]}
                            >
                              <View>
                                <Text
                                  style={[
                                    styles.addVariantLabel,
                                    active && styles.addVariantLabelActive,
                                  ]}
                                >
                                  {variant.label}
                                </Text>
                                <Text
                                  style={[
                                    styles.addVariantPrice,
                                    active && styles.addVariantLabelActive,
                                  ]}
                                >
                                  ₱{formatMoney(variant.price)}
                                </Text>
                              </View>

                              {active && (
                                <Ionicons
                                  name="checkmark-circle"
                                  size={22}
                                  color={COLORS.white}
                                />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))
                  )}
                </ScrollView>

                {selectedVariantId ? (
                  <View style={styles.addSummaryBox}>
                    <Text style={styles.modalLabel}>Quantity</Text>
                    <TextInput
                      value={newQty}
                      onChangeText={setNewQty}
                      keyboardType="numeric"
                      style={styles.input}
                    />

                    <Text style={styles.modalLabel}>Price</Text>
                    <TextInput
                      value={newPrice}
                      onChangeText={setNewPrice}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                ) : (
                  <Text style={styles.helperText}>Select a variant first.</Text>
                )}

                <TouchableOpacity
                  onPress={addItemToOrder}
                  style={styles.modalSaveBtn}
                >
                  <Text style={styles.modalSaveText}>Add Item</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setAddModalOpen(false)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatInvoiceDate(date: string) {
  const d = new Date(date);

  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.cream,
    padding: 18,
    paddingTop: 56,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: COLORS.brown,
    marginBottom: 14,
  },
  invoiceList: {
    marginBottom: 16,
    maxHeight: 90,
  },
  invoiceCard: {
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 18,
    marginRight: 10,
    minWidth: 130,
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  invoiceCardActive: {
    backgroundColor: COLORS.brown,
  },
  invoiceNo: {
    fontWeight: "900",
    color: COLORS.brown,
  },
  invoiceNoActive: {
    color: COLORS.white,
  },
  invoiceAmount: {
    marginTop: 6,
    color: COLORS.gold,
    fontWeight: "900",
  },
  invoiceImage: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#111",
    marginTop: 10,
    width: "100%",
  },
  invoiceHeader: {
    textAlign: "center",
    fontWeight: "900",
    fontSize: 16,
    padding: 10,
    borderBottomWidth: 2,
    borderColor: "#111",
    color: "#111",
  },
  deliveryText: {
    textAlign: "center",
    fontWeight: "800",
    fontSize: 13,
    padding: 8,
    borderBottomWidth: 2,
    borderColor: "#111",
    color: "#111",
  },
  addressText: {
    textAlign: "center",
    fontWeight: "700",
    fontSize: 12,
    padding: 8,
    borderBottomWidth: 2,
    borderColor: "#111",
    color: "#111",
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderColor: "#111",
  },
  dataRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderColor: "#111",
    minHeight: 48,
  },
  finalRow: {
    flexDirection: "row",
  },
  descriptionCol: {
    width: "46%",
  },
  qtyCol: {
    width: "14%",
  },
  priceCol: {
    width: "20%",
  },
  totalCol: {
    width: "20%",
    borderRightWidth: 0,
  },
  cellHeader: {
    fontWeight: "900",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRightWidth: 2,
    borderColor: "#111",
    color: "#111",
  },
  cellTextLeft: {
    fontSize: 12,
    padding: 8,
    borderRightWidth: 2,
    borderColor: "#111",
    color: "#111",
  },
  cellText: {
    fontSize: 12,
    padding: 8,
    textAlign: "center",
    borderRightWidth: 2,
    borderColor: "#111",
    color: "#111",
  },
  totalTextLeft: {
    fontSize: 14,
    padding: 8,
    fontWeight: "900",
    borderRightWidth: 2,
    borderColor: "#111",
    color: "#111",
  },
  totalText: {
    fontSize: 14,
    padding: 8,
    textAlign: "center",
    fontWeight: "900",
    borderRightWidth: 2,
    borderColor: "#111",
    color: "#111",
  },
  editPanel: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  editPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  editPanelTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.brown,
  },
  addItemBtn: {
    backgroundColor: COLORS.dark,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addItemText: {
    color: COLORS.white,
    fontWeight: "900",
  },
  editItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFDF8",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    gap: 8,
  },
  editItemName: {
    fontWeight: "900",
    color: COLORS.dark,
  },
  editItemSub: {
    color: COLORS.brown,
    fontWeight: "700",
    marginTop: 3,
  },
  editIconButton: {
    backgroundColor: COLORS.gold,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIconButton: {
    backgroundColor: COLORS.red,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.dark,
    padding: 16,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnGold: {
    flex: 1,
    backgroundColor: COLORS.gold,
    padding: 16,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  actionText: {
    color: COLORS.white,
    fontWeight: "900",
  },
  deleteInvoiceBtn: {
    backgroundColor: COLORS.red,
    padding: 16,
    borderRadius: 18,
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  deleteInvoiceText: {
    color: COLORS.white,
    fontWeight: "900",
  },
  emptyBox: {
    backgroundColor: COLORS.card,
    padding: 24,
    borderRadius: 22,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.brown,
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalSafeArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: COLORS.cream,
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.brown,
    marginBottom: 14,
  },
  modalLabel: {
    color: COLORS.brown,
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "#E8D8BE",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    color: COLORS.dark,
    fontWeight: "800",
  },
  modalSaveBtn: {
    backgroundColor: COLORS.dark,
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 8,
  },
  modalSaveText: {
    color: COLORS.white,
    fontWeight: "900",
  },
  modalCancelBtn: {
    padding: 16,
    alignItems: "center",
  },
  modalCancelText: {
    color: COLORS.brown,
    fontWeight: "900",
  },
  selectPill: {
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "#E8D8BE",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  selectPillActive: {
    backgroundColor: COLORS.brown,
    borderColor: COLORS.brown,
  },
  selectPillText: {
    color: COLORS.brown,
    fontWeight: "900",
  },
  selectPillTextActive: {
    color: COLORS.white,
  },
  helperText: {
    color: COLORS.brown,
    fontWeight: "800",
    textAlign: "center",
    marginVertical: 10,
  },
  addProductCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: "#ECDDC3",
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
  },
  addProductName: {
    color: COLORS.brown,
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 8,
  },
  addVariantRow: {
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "#E8D8BE",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addVariantActive: {
    backgroundColor: COLORS.brown,
    borderColor: COLORS.brown,
  },
  addVariantLabel: {
    color: COLORS.dark,
    fontWeight: "900",
  },
  addVariantPrice: {
    color: COLORS.gold,
    fontWeight: "900",
    marginTop: 3,
  },
  addVariantLabelActive: {
    color: COLORS.white,
  },
  addSummaryBox: {
    backgroundColor: "#F6EAD7",
    padding: 12,
    borderRadius: 16,
    marginTop: 10,
  },
});
