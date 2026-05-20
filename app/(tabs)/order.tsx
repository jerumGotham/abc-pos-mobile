import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import ViewShot from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import { api } from "@/services/api";
import { Customer, Product } from "@/types";

const COLORS = {
  cream: "#F7EEDC",
  card: "#FFF9EE",
  brown: "#5A3825",
  lightBrown: "#A9745B",
  gold: "#B8894A",
  dark: "#2B1A12",
  white: "#FFFFFF",
  danger: "#B3261E",
};

export default function OrderScreen() {
  const invoiceRef = useRef<ViewShot>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cartItems, setCartItems] = useState<any>({});

  const [loading, setLoading] = useState(true);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  const [platform, setPlatform] = useState("Messenger");

  const now = new Date();
  const [deliveryDate, setDeliveryDate] = useState<Date>(now);
  const [deliveryTime, setDeliveryTime] = useState<Date>(now);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [invoiceVisible, setInvoiceVisible] = useState(false);

  const [savedOrder, setSavedOrder] = useState<any>(null);

  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");

  const cartList = Object.entries(cartItems).map(([key, value]: any) => ({
    key,
    ...value,
  }));

  const total = cartList.reduce(
    (sum: number, item: any) =>
      sum + Number(item.price) * Number(item.quantity),
    0,
  );

  const totalQty = cartList.reduce(
    (sum: number, item: any) => sum + Number(item.quantity),
    0,
  );

  const refreshAll = async () => {
    try {
      setRefreshing(true);
      setLoading(true);

      const productRes = await api.get("/products");
      setProducts(productRes.data);
    } catch (error) {
      console.log("REFRESH ERROR:", error);
      Alert.alert("Error", "Cannot connect to backend.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const value = customerSearch.trim();

      if (selectedCustomer?.name === value) return;

      if (value.length < 2) {
        setCustomers([]);
        return;
      }

      try {
        setCustomerLoading(true);

        const res = await api.get(
          `/customers?search=${encodeURIComponent(value)}`,
        );

        setCustomers(res.data);
      } catch {
        setCustomers([]);
      } finally {
        setCustomerLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [customerSearch, selectedCustomer]);

  const filteredProducts = useMemo(() => {
    const value = productSearch.trim().toLowerCase();

    if (!value) return products;

    return products.filter((product: any) => {
      const productMatch = product.name.toLowerCase().includes(value);

      const variantMatch = product.variants.some((variant: any) =>
        variant.label.toLowerCase().includes(value),
      );

      return productMatch || variantMatch;
    });
  }, [products, productSearch]);

  const addToCart = (product: Product, variant: any) => {
    Keyboard.dismiss();

    const key = `${product.id}-${variant.id}`;
    const current = cartItems[key];

    setCartItems({
      ...cartItems,
      [key]: {
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        variantLabel: variant.label,
        price: current ? current.price : variant.price,
        quantity: current ? Number(current.quantity) + 1 : 1,
      },
    });
  };

  const increaseCartQty = (key: string) => {
    const current = cartItems[key];
    if (!current) return;

    setCartItems({
      ...cartItems,
      [key]: {
        ...current,
        quantity: Number(current.quantity) + 1,
      },
    });
  };

  const decreaseCartQty = (key: string) => {
    const current = cartItems[key];
    if (!current) return;

    const nextQty = Number(current.quantity) - 1;

    if (nextQty <= 0) {
      const copy = { ...cartItems };
      delete copy[key];
      setCartItems(copy);
      return;
    }

    setCartItems({
      ...cartItems,
      [key]: {
        ...current,
        quantity: nextQty,
      },
    });
  };

  const updateCartQty = (key: string, value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, "");

    if (cleanValue === "") {
      setCartItems({
        ...cartItems,
        [key]: {
          ...cartItems[key],
          quantity: "",
        },
      });
      return;
    }

    const qty = Number(cleanValue);

    if (qty <= 0) {
      const copy = { ...cartItems };
      delete copy[key];
      setCartItems(copy);
      return;
    }

    setCartItems({
      ...cartItems,
      [key]: {
        ...cartItems[key],
        quantity: qty,
      },
    });
  };

  const updateCartPrice = (key: string, value: string) => {
    const cleanValue = value.replace(/[^0-9.]/g, "");

    setCartItems({
      ...cartItems,
      [key]: {
        ...cartItems[key],
        price: cleanValue,
      },
    });
  };

  const removeCartItem = (key: string) => {
    const copy = { ...cartItems };
    delete copy[key];
    setCartItems(copy);
  };

  const resetCustomerModal = () => {
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerAddress("");
  };

  const saveCustomer = async () => {
    if (!newCustomerName.trim()) {
      Alert.alert("Required", "Customer name is required.");
      return;
    }

    try {
      const res = await api.post("/customers", {
        name: newCustomerName.trim(),
        contact: newCustomerPhone.trim(),
        address: newCustomerAddress.trim(),
        platform,
      });

      setSelectedCustomer(res.data);
      setCustomerSearch(res.data.name);
      setCustomers([]);

      resetCustomerModal();
      setCustomerModalOpen(false);
      Keyboard.dismiss();
    } catch {
      Alert.alert("Error", "Failed to save customer.");
    }
  };

  const createOrder = async () => {
    if (!selectedCustomer) {
      Alert.alert("Customer required", "Please select or create a customer.");
      return;
    }

    if (cartList.length === 0) {
      Alert.alert("No items", "Please add at least one product.");
      return;
    }

    const invalidItem = cartList.find(
      (item: any) => Number(item.quantity) <= 0 || Number(item.price) < 0,
    );

    if (invalidItem) {
      Alert.alert("Invalid item", "Please check item quantity and price.");
      return;
    }

    let deliveryAtValue = null;

    if (deliveryDate && deliveryTime) {
      const finalDate = new Date(deliveryDate);
      finalDate.setHours(deliveryTime.getHours());
      finalDate.setMinutes(deliveryTime.getMinutes());
      finalDate.setSeconds(0);
      deliveryAtValue = finalDate.toISOString();
    }

    try {
      setCreatingOrder(true);

      const res = await api.post("/orders", {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.contact,
        customerAddress: selectedCustomer.address,
        platform,
        deliveryAt: deliveryAtValue,
        paymentMethod: "GCASH",
        paymentStatus: "PAID",
        items: cartList.map((item: any) => ({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantLabel: item.variantLabel,
          price: Number(item.price),
          quantity: Number(item.quantity),
        })),
      });

      setSavedOrder(res.data);
      setCartModalOpen(false);
      setInvoiceVisible(true);

      setCartItems({});
      setSelectedCustomer(null);
      setCustomerSearch("");
      setCustomers([]);

      const today = new Date();
      setDeliveryDate(today);
      setDeliveryTime(today);
    } catch (error: any) {
      console.log(
        "CREATE ORDER ERROR:",
        error?.response?.data || error?.message,
      );

      Alert.alert(
        "Error",
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to create order.",
      );
    } finally {
      setCreatingOrder(false);
    }
  };

  const saveInvoiceImage = async () => {
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow photo permission.");
        return;
      }

      const uri = await invoiceRef.current?.capture?.();

      if (!uri) {
        Alert.alert("Error", "Unable to capture invoice.");
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);

      Alert.alert("Saved", "Invoice image saved to gallery.");
    } catch (error) {
      console.log("SAVE IMAGE ERROR:", error);
      Alert.alert("Error", "Failed to save invoice image.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshAll}
            tintColor={COLORS.brown}
            colors={[COLORS.brown]}
            progressBackgroundColor={COLORS.card}
          />
        }
      >
        <Text style={styles.title}>Customer</Text>

        <View style={styles.customerBox}>
          <TextInput
            placeholder="Search customer name..."
            placeholderTextColor="#9B8B7A"
            value={customerSearch}
            onChangeText={(value) => {
              setCustomerSearch(value);
              setSelectedCustomer(null);
            }}
            style={styles.input}
            returnKeyType="search"
          />

          {customerLoading && (
            <Text style={styles.helperText}>Searching customer...</Text>
          )}

          {customerSearch.trim().length >= 2 &&
            customers.map((customer) => (
              <TouchableOpacity
                key={customer.id}
                onPress={() => {
                  Keyboard.dismiss();
                  setSelectedCustomer(customer);
                  setCustomerSearch(customer.name);
                  setCustomers([]);
                  setPlatform(customer.platform || platform);
                }}
                style={styles.customerPill}
              >
                <Text style={styles.customerText}>{customer.name}</Text>
                <Text style={styles.customerSubText}>
                  {customer.platform || "No platform"} •{" "}
                  {customer.address || "No address"}
                </Text>
              </TouchableOpacity>
            ))}

          {customerSearch.trim().length >= 2 &&
            customers.length === 0 &&
            !customerLoading &&
            !selectedCustomer && (
              <TouchableOpacity
                onPress={() => {
                  setNewCustomerName(customerSearch);
                  setCustomerModalOpen(true);
                }}
                style={styles.createCustomerButton}
              >
                <Ionicons
                  name="person-add-outline"
                  size={18}
                  color={COLORS.white}
                />
                <Text style={styles.createCustomerText}>
                  Create “{customerSearch}”
                </Text>
              </TouchableOpacity>
            )}

          <TouchableOpacity
            onPress={() => setCustomerModalOpen(true)}
            style={styles.createCustomerButtonAlt}
          >
            <Ionicons
              name="add-circle-outline"
              size={18}
              color={COLORS.brown}
            />
            <Text style={styles.createCustomerTextAlt}>
              Create New Customer
            </Text>
          </TouchableOpacity>

          {selectedCustomer && (
            <View style={styles.selectedCustomerBox}>
              <Text style={styles.selectedCustomerText}>
                Selected: {selectedCustomer.name}
              </Text>
              <Text style={styles.selectedCustomerSub}>
                {selectedCustomer.address || "No address"}
              </Text>
            </View>
          )}

          <Text style={styles.smallLabel}>Order Type</Text>

          <View style={styles.platformRow}>
            {["Messenger", "FB Page", "Walk-in", "Instagram"].map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setPlatform(p)}
                style={[
                  styles.platformPill,
                  platform === p && styles.platformActive,
                ]}
              >
                <Text
                  style={[
                    styles.platformText,
                    platform === p && styles.platformTextActive,
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.smallLabel}>Preferred Delivery Date</Text>

          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={styles.pickerButton}
          >
            <Ionicons name="calendar-outline" size={20} color={COLORS.brown} />
            <Text style={styles.pickerText}>{formatDate(deliveryDate)}</Text>
          </TouchableOpacity>

          <Text style={styles.smallLabel}>Preferred Delivery Time</Text>

          <TouchableOpacity
            onPress={() => setShowTimePicker(true)}
            style={styles.pickerButton}
          >
            <Ionicons name="time-outline" size={20} color={COLORS.brown} />
            <Text style={styles.pickerText}>{formatTime(deliveryTime)}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Products</Text>

        <TextInput
          placeholder="Search product or variant..."
          placeholderTextColor="#9B8B7A"
          value={productSearch}
          onChangeText={setProductSearch}
          style={styles.input}
          returnKeyType="search"
        />

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.brown} />
        ) : filteredProducts.length === 0 ? (
          <View style={styles.noResultBox}>
            <Ionicons
              name="search-outline"
              size={28}
              color={COLORS.lightBrown}
            />
            <Text style={styles.noResultText}>No product found</Text>
          </View>
        ) : (
          filteredProducts.map((product: any) => (
            <View key={product.id} style={styles.productCard}>
              <Text style={styles.productName}>{product.name}</Text>

              {product.variants.map((variant: any) => {
                const key = `${product.id}-${variant.id}`;
                const qty = cartItems[key]?.quantity || 0;

                return (
                  <View key={variant.id} style={styles.variantRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.variantLabel}>{variant.label}</Text>
                      <Text style={styles.price}>₱{variant.price}</Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => addToCart(product, variant)}
                      style={styles.productPlusButton}
                    >
                      <Ionicons name="add" size={22} color={COLORS.white} />
                    </TouchableOpacity>

                    {qty > 0 && (
                      <View style={styles.productQtyBadge}>
                        <Text style={styles.productQtyBadgeText}>{qty}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))
        )}

        <View style={{ height: 160 }} />
      </ScrollView>

      {totalQty > 0 && (
        <TouchableOpacity
          onPress={() => setCartModalOpen(true)}
          style={styles.floatingCartButton}
        >
          <View>
            <Text style={styles.floatingCartText}>Cart</Text>
            <Text style={styles.floatingCartSub}>
              {totalQty} item{totalQty > 1 ? "s" : ""} • ₱{total}
            </Text>
          </View>

          <View style={styles.cartIconBox}>
            <Ionicons name="cart-outline" size={24} color={COLORS.white} />
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalQty}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      <Modal visible={cartModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.cartModalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Cart</Text>

              <TouchableOpacity onPress={() => setCartModalOpen(false)}>
                <Ionicons name="close-circle" size={30} color={COLORS.brown} />
              </TouchableOpacity>
            </View>

            {selectedCustomer && (
              <View style={styles.cartCustomerBox}>
                <Text style={styles.cartCustomerLabel}>Customer</Text>
                <Text style={styles.cartCustomerName}>
                  {selectedCustomer.name}
                </Text>
                <Text style={styles.cartCustomerInfo}>
                  {selectedCustomer.contact || "No contact"} •{" "}
                  {selectedCustomer.address || "No address"}
                </Text>
              </View>
            )}

            {cartList.length === 0 ? (
              <View style={styles.emptyCartBox}>
                <Ionicons
                  name="cart-outline"
                  size={42}
                  color={COLORS.lightBrown}
                />
                <Text style={styles.emptyCartText}>Your cart is empty.</Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {cartList.map((item: any) => (
                  <View key={item.key} style={styles.cartItemCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartProductName}>
                        {item.productName}
                      </Text>
                      <Text style={styles.cartVariantName}>
                        {item.variantLabel}
                      </Text>

                      <Text style={styles.cartSmallLabel}>Price</Text>
                      <TextInput
                        keyboardType="numeric"
                        value={String(item.price)}
                        onChangeText={(value) =>
                          updateCartPrice(item.key, value)
                        }
                        style={styles.cartInput}
                      />
                    </View>

                    <View style={styles.cartQtyArea}>
                      <TouchableOpacity
                        onPress={() => removeCartItem(item.key)}
                        style={styles.removeItemButton}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={COLORS.danger}
                        />
                      </TouchableOpacity>

                      <View style={styles.cartQtyBox}>
                        <TouchableOpacity
                          onPress={() => decreaseCartQty(item.key)}
                          style={styles.cartQtyButtonLight}
                        >
                          <Ionicons
                            name="remove"
                            size={18}
                            color={COLORS.brown}
                          />
                        </TouchableOpacity>

                        <TextInput
                          keyboardType="numeric"
                          value={String(item.quantity)}
                          onChangeText={(value) =>
                            updateCartQty(item.key, value)
                          }
                          style={styles.qtyInput}
                        />

                        <TouchableOpacity
                          onPress={() => increaseCartQty(item.key)}
                          style={styles.cartQtyButton}
                        >
                          <Ionicons name="add" size={18} color={COLORS.white} />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.cartSubtotal}>
                        ₱{Number(item.price || 0) * Number(item.quantity || 0)}
                      </Text>
                    </View>
                  </View>
                ))}

                <View style={styles.cartTotalBox}>
                  <Text style={styles.cartTotalLabel}>Total</Text>
                  <Text style={styles.cartTotalAmount}>₱{total}</Text>
                </View>
              </ScrollView>
            )}

            <View style={styles.cartActionRow}>
              <TouchableOpacity
                onPress={() => setCartModalOpen(false)}
                style={styles.cancelCartButton}
              >
                <Text style={styles.cancelCartText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={createOrder}
                disabled={creatingOrder || cartList.length === 0}
                style={[
                  styles.createOrderButton,
                  (creatingOrder || cartList.length === 0) &&
                    styles.disabledButton,
                ]}
              >
                {creatingOrder ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons
                      name="receipt-outline"
                      size={20}
                      color={COLORS.white}
                    />
                    <Text style={styles.createOrderText}>Create Order</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={invoiceVisible} animationType="slide">
        <SafeAreaView style={styles.invoiceSafe}>
          <ScrollView contentContainerStyle={styles.invoicePage}>
            {savedOrder && (
              <ViewShot
                ref={invoiceRef}
                options={{ format: "png", quality: 1 }}
              >
                <View style={styles.receiptTable}>
                  <View style={styles.receiptFullRow}>
                    <Text style={styles.receiptTitle}>
                      {(
                        savedOrder.customer?.name ||
                        savedOrder.customerName ||
                        "CUSTOMER"
                      ).toUpperCase()}{" "}
                      /{" "}
                      {(
                        savedOrder.platform ||
                        platform ||
                        "MESSENGER"
                      ).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.receiptFullRow}>
                    <Text style={styles.receiptInfo}>
                      Delivery:{" "}
                      {savedOrder.deliveryAt
                        ? new Date(savedOrder.deliveryAt).toLocaleString(
                            "en-US",
                            {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            },
                          )
                        : "N/A"}
                    </Text>
                  </View>

                  <View style={styles.receiptFullRow}>
                    <Text style={styles.receiptInfo}>
                      Address:{" "}
                      {savedOrder.customer?.address ||
                        savedOrder.customerAddress ||
                        "N/A"}
                    </Text>
                  </View>

                  <View style={styles.receiptHeaderRow}>
                    <Text
                      style={[styles.receiptHeaderCell, styles.descriptionCell]}
                    >
                      Description
                    </Text>
                    <Text style={[styles.receiptHeaderCell, styles.qtyCell]}>
                      Qty.
                    </Text>
                    <Text style={[styles.receiptHeaderCell, styles.priceCell]}>
                      Price
                    </Text>
                    <Text style={[styles.receiptHeaderCell, styles.totalCell]}>
                      Total
                    </Text>
                  </View>

                  {(savedOrder.items || []).map((item: any, index: number) => (
                    <View key={index} style={styles.receiptItemRow}>
                      <Text
                        style={[styles.receiptItemCell, styles.descriptionCell]}
                      >
                        {`${item.product?.name || item.productName || "PRODUCT"} - ${
                          item.variant?.label || item.variantLabel || "VARIANT"
                        }`.toUpperCase()}
                      </Text>

                      <Text style={[styles.receiptItemCell, styles.qtyCell]}>
                        {item.quantity}
                      </Text>

                      <Text style={[styles.receiptItemCell, styles.priceCell]}>
                        {Number(item.price)}
                      </Text>

                      <Text style={[styles.receiptItemCell, styles.totalCell]}>
                        {Number(item.price) * Number(item.quantity)}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.receiptTotalRow}>
                    <Text
                      style={[styles.receiptTotalText, styles.descriptionCell]}
                    >
                      Total
                    </Text>

                    <Text style={[styles.receiptTotalText, styles.qtyCell]}>
                      {(savedOrder.items || []).reduce(
                        (sum: number, item: any) => sum + Number(item.quantity),
                        0,
                      )}
                    </Text>

                    <Text style={[styles.receiptTotalText, styles.priceCell]} />

                    <Text style={[styles.receiptTotalText, styles.totalCell]}>
                      {(savedOrder.items || []).reduce(
                        (sum: number, item: any) =>
                          sum + Number(item.price) * Number(item.quantity),
                        0,
                      )}
                    </Text>
                  </View>
                </View>
              </ViewShot>
            )}

            <View style={styles.invoiceButtonRow}>
              <TouchableOpacity
                onPress={() => setInvoiceVisible(false)}
                style={styles.invoiceCloseButton}
              >
                <Text style={styles.invoiceCloseText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={saveInvoiceImage}
                style={styles.invoiceSaveButton}
              >
                <Ionicons name="image-outline" size={20} color={COLORS.white} />
                <Text style={styles.invoiceSaveText}>Save Image</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Delivery Date</Text>

            <DateTimePicker
              value={deliveryDate || new Date()}
              mode="date"
              display="spinner"
              style={styles.picker}
              onChange={(event, selectedDate) => {
                if (selectedDate) setDeliveryDate(selectedDate);
              }}
            />

            <TouchableOpacity
              onPress={() => setShowDatePicker(false)}
              style={styles.saveCustomerButton}
            >
              <Text style={styles.saveCustomerText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showTimePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Delivery Time</Text>

            <DateTimePicker
              value={deliveryTime || new Date()}
              mode="time"
              display="spinner"
              style={styles.picker}
              onChange={(event, selectedTime) => {
                if (selectedTime) setDeliveryTime(selectedTime);
              }}
            />

            <TouchableOpacity
              onPress={() => setShowTimePicker(false)}
              style={styles.saveCustomerButton}
            >
              <Text style={styles.saveCustomerText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={customerModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.keyboardSafeArea}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Create Customer</Text>

                <TextInput
                  placeholder="Customer name"
                  placeholderTextColor="#9B8B7A"
                  value={newCustomerName}
                  onChangeText={setNewCustomerName}
                  style={styles.input}
                />

                <TextInput
                  placeholder="Contact number optional"
                  placeholderTextColor="#9B8B7A"
                  value={newCustomerPhone}
                  onChangeText={setNewCustomerPhone}
                  style={styles.input}
                  keyboardType="phone-pad"
                />

                <TextInput
                  placeholder="Address optional"
                  placeholderTextColor="#9B8B7A"
                  value={newCustomerAddress}
                  onChangeText={setNewCustomerAddress}
                  style={[styles.input, styles.addressInput]}
                  multiline
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  onPress={saveCustomer}
                  style={styles.saveCustomerButton}
                >
                  <Text style={styles.saveCustomerText}>Save Customer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    resetCustomerModal();
                    setCustomerModalOpen(false);
                    Keyboard.dismiss();
                  }}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.brown,
    marginBottom: 14,
  },
  customerBox: {
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#ECDDC3",
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
  addressInput: {
    height: 110,
    paddingTop: 14,
  },
  helperText: {
    color: COLORS.lightBrown,
    fontWeight: "800",
    marginBottom: 10,
  },
  customerPill: {
    backgroundColor: "#F6EAD7",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  customerText: {
    color: COLORS.brown,
    fontWeight: "900",
  },
  customerSubText: {
    color: COLORS.lightBrown,
    fontWeight: "700",
    marginTop: 3,
  },
  createCustomerButton: {
    backgroundColor: COLORS.dark,
    padding: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  createCustomerText: {
    color: COLORS.white,
    fontWeight: "900",
  },
  createCustomerButtonAlt: {
    backgroundColor: "#F6EAD7",
    padding: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  createCustomerTextAlt: {
    color: COLORS.brown,
    fontWeight: "900",
  },
  selectedCustomerBox: {
    backgroundColor: "#F6EAD7",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  selectedCustomerText: {
    color: COLORS.brown,
    fontWeight: "900",
  },
  selectedCustomerSub: {
    color: COLORS.lightBrown,
    marginTop: 3,
    fontWeight: "700",
  },
  smallLabel: {
    color: COLORS.brown,
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 8,
  },
  platformRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  platformPill: {
    backgroundColor: "#F6EAD7",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  platformActive: {
    backgroundColor: COLORS.gold,
  },
  platformText: {
    color: COLORS.brown,
    fontWeight: "900",
  },
  platformTextActive: {
    color: COLORS.white,
  },
  pickerButton: {
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "#E8D8BE",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pickerText: {
    color: COLORS.dark,
    fontWeight: "900",
  },
  noResultBox: {
    backgroundColor: COLORS.card,
    padding: 24,
    borderRadius: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  noResultText: {
    marginTop: 8,
    color: COLORS.brown,
    fontWeight: "900",
  },
  productCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  productName: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.brown,
    marginBottom: 10,
  },
  variantRow: {
    backgroundColor: "#FFFDF8",
    padding: 14,
    borderRadius: 18,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
  },
  variantLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.dark,
  },
  price: {
    marginTop: 4,
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: "900",
  },
  productPlusButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.brown,
    alignItems: "center",
    justifyContent: "center",
  },
  productQtyBadge: {
    position: "absolute",
    right: 5,
    top: 5,
    backgroundColor: COLORS.gold,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  productQtyBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "900",
  },
  floatingCartButton: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 24,
    backgroundColor: COLORS.dark,
    padding: 18,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  floatingCartText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "900",
  },
  floatingCartSub: {
    color: "#EADCCB",
    fontWeight: "800",
    marginTop: 2,
  },
  cartIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.brown,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadge: {
    position: "absolute",
    right: -5,
    top: -5,
    backgroundColor: COLORS.gold,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  keyboardSafeArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: COLORS.cream,
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    width: "100%",
  },
  cartModalBox: {
    backgroundColor: COLORS.cream,
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    width: "100%",
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.brown,
    marginBottom: 16,
  },
  emptyCartBox: {
    padding: 30,
    alignItems: "center",
  },
  emptyCartText: {
    marginTop: 10,
    fontWeight: "900",
    color: COLORS.brown,
  },
  cartItemCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  cartProductName: {
    color: COLORS.brown,
    fontSize: 16,
    fontWeight: "900",
  },
  cartVariantName: {
    color: COLORS.lightBrown,
    fontWeight: "800",
    marginTop: 3,
  },
  cartSmallLabel: {
    color: COLORS.brown,
    fontWeight: "900",
    marginTop: 10,
    marginBottom: 5,
  },
  cartInput: {
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "#E8D8BE",
    borderRadius: 12,
    padding: 10,
    width: 100,
    fontWeight: "900",
    color: COLORS.dark,
  },
  cartQtyArea: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  removeItemButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFE8E5",
    alignItems: "center",
    justifyContent: "center",
  },
  cartQtyBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6EAD7",
    borderRadius: 999,
    padding: 5,
    marginVertical: 10,
  },
  cartQtyButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.brown,
    alignItems: "center",
    justifyContent: "center",
  },
  cartQtyButtonLight: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyInput: {
    width: 45,
    textAlign: "center",
    fontWeight: "900",
    color: COLORS.brown,
    paddingVertical: 5,
  },
  cartSubtotal: {
    color: COLORS.dark,
    fontWeight: "900",
  },
  cartTotalBox: {
    backgroundColor: COLORS.dark,
    borderRadius: 20,
    padding: 18,
    marginTop: 6,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cartTotalLabel: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "900",
  },
  cartTotalAmount: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "900",
  },
  cartActionRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 8,
  },
  cancelCartButton: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#F6EAD7",
    alignItems: "center",
  },
  cancelCartText: {
    color: COLORS.brown,
    fontWeight: "900",
  },
  createOrderButton: {
    flex: 1.4,
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLORS.dark,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  createOrderText: {
    color: COLORS.white,
    fontWeight: "900",
  },
  picker: {
    width: "100%",
  },
  saveCustomerButton: {
    backgroundColor: COLORS.dark,
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 8,
  },
  saveCustomerText: {
    color: COLORS.white,
    fontWeight: "900",
  },
  cancelButton: {
    padding: 16,
    alignItems: "center",
  },
  cancelText: {
    color: COLORS.brown,
    fontWeight: "900",
  },
  invoiceSafe: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  invoicePage: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    paddingVertical: 40,
  },
  invoiceBox: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E8D8BE",
  },
  invoiceBrand: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.brown,
  },
  invoiceNo: {
    textAlign: "center",
    marginTop: 6,
    color: COLORS.lightBrown,
    fontWeight: "900",
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: "#E8D8BE",
    marginVertical: 16,
  },
  invoiceCustomer: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.dark,
    textAlign: "center",
    marginBottom: 10,
  },
  invoiceInfo: {
    color: COLORS.brown,
    fontWeight: "700",
    marginBottom: 5,
  },
  invoiceItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  invoiceItemName: {
    color: COLORS.dark,
    fontWeight: "900",
  },
  invoiceItemSub: {
    color: COLORS.lightBrown,
    fontWeight: "700",
    marginTop: 2,
  },
  invoiceItemPrice: {
    color: COLORS.dark,
    fontWeight: "900",
  },
  invoiceTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  invoiceTotalLabel: {
    fontSize: 20,
    color: COLORS.dark,
    fontWeight: "900",
  },
  invoiceTotalAmount: {
    fontSize: 22,
    color: COLORS.brown,
    fontWeight: "900",
  },
  invoiceFooter: {
    textAlign: "center",
    marginTop: 24,
    color: COLORS.lightBrown,
    fontWeight: "900",
  },
  invoiceButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  invoiceCloseButton: {
    flex: 1,
    backgroundColor: "#a09d99",
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  invoiceCloseText: {
    color: COLORS.brown,
    fontWeight: "900",
  },
  invoiceSaveButton: {
    flex: 1.4,
    backgroundColor: COLORS.dark,
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  invoiceSaveText: {
    color: COLORS.white,
    fontWeight: "900",
  },
  cartCustomerBox: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  cartCustomerLabel: {
    color: COLORS.lightBrown,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  cartCustomerName: {
    color: COLORS.brown,
    fontSize: 18,
    fontWeight: "900",
  },
  cartCustomerInfo: {
    color: COLORS.lightBrown,
    fontWeight: "700",
    marginTop: 4,
  },
  receiptTable: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: "#000",
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,

    elevation: 8,
  },

  receiptFullRow: {
    borderBottomWidth: 2,
    borderColor: "#000",
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  receiptTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#000",
    textAlign: "center",
  },

  receiptInfo: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000",
    textAlign: "center",
  },

  receiptHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderColor: "#000",
    minHeight: 58,
  },

  receiptHeaderCell: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000",
    textAlign: "center",
    textAlignVertical: "center",
    paddingVertical: 14,
    borderRightWidth: 2,
    borderColor: "#000",
  },

  receiptItemRow: {
    flexDirection: "row",
    minHeight: 75,
    borderBottomWidth: 2,
    borderColor: "#000",
  },

  receiptItemCell: {
    fontSize: 15,
    color: "#000",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRightWidth: 2,
    borderColor: "#000",
    textAlign: "center",
  },

  receiptTotalRow: {
    flexDirection: "row",
    minHeight: 55,
  },

  receiptTotalText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRightWidth: 2,
    borderColor: "#000",
    textAlign: "center",
  },

  descriptionCell: {
    width: "46%",
    textAlign: "left",
  },

  qtyCell: {
    width: "16%",
    textAlign: "center",
  },

  priceCell: {
    width: "19%",
    textAlign: "center",
  },

  totalCell: {
    width: "19%",
    textAlign: "center",
    borderRightWidth: 0,
  },
});
