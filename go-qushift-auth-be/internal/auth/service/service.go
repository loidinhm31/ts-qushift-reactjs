package service

import (
	"context"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/google/uuid"
	"go-qushift-auth-be/internal/auth"
	"go-qushift-auth-be/internal/dto"
	"go-qushift-auth-be/internal/errors"
	"go-qushift-auth-be/internal/middlewares"
	"go-qushift-auth-be/internal/models"
	"strings"
	"time"
)

type AuthClaims struct {
	jwt.StandardClaims
	Username string `json:"username"`
	UserId   string `json:"userId"`
}

type authService struct {
	userRepository auth.UserRepository
	signingKey     []byte
	expireDuration time.Duration
}

func NewAuthService(userRepository auth.UserRepository, signingKey []byte, tokenTTL int64) auth.Service {
	return &authService{
		userRepository: userRepository,
		signingKey:     signingKey,
		expireDuration: time.Second * time.Duration(tokenTTL),
	}
}

func (a *authService) SignUp(ctx context.Context, userDto *dto.UserDto) error {
	fmtUsername := strings.ToLower(userDto.Username)
	euser, _ := a.userRepository.GetUserByUsername(ctx, fmtUsername)

	if euser != nil {
		return errors.ErrUserExisted
	}
	user := &models.User{
		UserID:    uuid.New().String(),
		Username:  fmtUsername,
		Password:  userDto.Password,
		FirstName: userDto.FirstName,
		LastName:  userDto.LastName,
	}
	user.HashPassword()
	err := a.userRepository.CreateUser(ctx, user)
	if err != nil {
		return err
	}

	return nil
}

func (a *authService) SignIn(ctx context.Context, username, password string) (string, error) {
	user, _ := a.userRepository.GetUserByUsername(ctx, username)
	if user == nil {
		return "", errors.ErrNotFound
	}

	if !user.ComparePassword(password) {
		return "", errors.ErrWrongPassword
	}
	claims := AuthClaims{
		Username: user.Username,
		UserId:   user.UserID,
		StandardClaims: jwt.StandardClaims{
			IssuedAt:  time.Now().Unix(),
			Issuer:    "qushift",
			ExpiresAt: time.Now().Add(a.expireDuration).Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString(a.signingKey)
}

func (a *authService) ParseToken(ctx context.Context, accessToken string) (string, error) {
	token, err := jwt.ParseWithClaims(accessToken, &AuthClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return a.signingKey, nil
	})

	if err != nil {
		return "", err
	}

	if claims, ok := token.Claims.(*AuthClaims); ok && token.Valid {
		return claims.UserId, nil
	}

	return "", errors.ErrInvalidAccessToken
}

func (a *authService) VerifyToken(ctx context.Context, c *gin.Context) error {
	userId, exist := c.Get(middlewares.CtxUserKey)
	fmt.Println(userId)
	if !exist {
		return errors.ErrInvalidAccessToken
	}

	result, err := a.userRepository.GetUserById(ctx, fmt.Sprintf("%s", userId))
	if err != nil {
		return errors.ErrNotFound
	}

	if result.UserID != userId {
		return errors.ErrNotFound
	}

	return nil
}